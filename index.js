/*
 * Copyright 2016 Scott Bender <scott@scottbender.net>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const Bacon = require('baconjs');
const util = require('util')
const _ = require('lodash')

const state_commands = {
    "auto":    "%s,3,126208,%s,%s,17,01,63,ff,00,f8,04,01,3b,07,03,04,04,40,00,05,ff,ff",
    "wind":    "%s,3,126208,%s,%s,17,01,63,ff,00,f8,04,01,3b,07,03,04,04,00,01,05,ff,ff",
    "route":   "%s,3,126208,%s,%s,17,01,63,ff,00,f8,04,01,3b,07,03,04,04,80,01,05,ff,ff",
    "standby": "%s,3,126208,%s,%s,17,01,63,ff,00,f8,04,01,3b,07,03,04,04,00,00,05,ff,ff"
  }
const heading_command = "%s,3,126208,%s,%s,14,01,50,ff,00,f8,03,01,3b,07,03,04,06,%s,%s"
const wind_direction_command = "%s,3,126208,%s,%s,14,01,41,ff,00,f8,03,01,3b,07,03,04,04,%s,%s"
const raymarine_ttw_Mode = "%s,3,126208,%s,%s,17,01,63,ff,00,f8,04,01,3b,07,03,04,04,81,01,05,ff,ff"
const raymarine_ttw = "%s,3,126208,%s,%s,21,00,00,ef,01,ff,ff,ff,ff,ff,ff,04,01,3b,07,03,04,04,6c,05,1a,50"

const raymarine_silence =  "%s,7,65361,%s,255,8,3b,9f,%s,%s,00,00,00,00"

const default_src = '1'
const autopilot_dst = '204'
const everyone_dst = '255'

const target_heading_path = "steering.autopilot.target.headingMagnetic.value"
const target_wind_path = "steering.autopilot.target.windAngleApparent.value"
const state_path = "steering.autopilot.state.value"

module.exports = function(app) {
  var unsubscribe = undefined
  var plugin = {}
  var deviceid
  
  plugin.start = function(props) {
    deviceid = props.deviceid
  };

  plugin.registerWithRouter = function(router) {
    router.post("/command", (req, res) => {
      if ( typeof deviceid != "undefined" )
      {
        sendCommand(app, deviceid, req.body)
        res.send("Executed command for plugin " + plugin.id)
      }
    })
  }  
  
  plugin.stop = function() {
    if (unsubscribe) {
      unsubscribe()
    }
  }
  
  plugin.id = "raymarineautopilot"
  plugin.name = "Raymarine Autopilot"
  plugin.description = "Plugin that controls a Raymarine autopilot"

  plugin.schema = {
    title: "Raymarine Autopilot Control",
    type: "object",
    required: [
      "deviceid"
    ],
    properties: {
      deviceid: {
        type: "string",
        title: "Autopilot N2K Device ID ",
        default: "204"
      }
    }
  }

  return plugin;
}

function padd(n, p, c)
{
  var pad_char = typeof c !== 'undefined' ? c : '0';
  var pad = new Array(1 + p).join(pad_char);
  return (pad + n).slice(-pad.length);
}

function changeHeading(app, deviceid, command_json)
{
  var ammount = command_json["value"]
  var state = app.getSelfPath(state_path)
  var new_value
  var command_format
  var n2k_msgs
  
  app.debug("changeHeading: " + state + " " + ammount)
  if ( state == "auto" )
  {
    var current = app.getSelfPath(target_heading_path)
    new_value = radsToDeg(current) + ammount

    if ( new_value < 0 ) {
      new_value = 360 + new_value
    } else if ( new_value > 360 ) {
      new_value = new_value - 360
    }
    
    app.debug(`current heading: ${radsToDeg(current)} new value: ${new_value}`)

    command_format = heading_command
  }
  else if ( state == "wind" )
  {
    var current = app.getSelfPath(target_wind_path)
    new_value = radsToDeg(current) + ammount
    
    if ( new_value < 0 )
      new_value = 360 + new_value
    else if ( new_value > 360 )
      new_value = new_value - 360

    app.debug(`current wind angle: ${radsToDeg(current)} new value: ${new_value}`)
    command_format = wind_direction_command
  }
  else
  {
    //error
  }
  if ( new_value )
  {
    new_value = Math.trunc(degsToRad(new_value) * 10000)
    n2k_msgs = [util.format(command_format, (new Date()).toISOString(), default_src,
                            autopilot_dst, padd((new_value & 0xff).toString(16), 2), padd(((new_value >> 8) & 0xff).toString(16), 2))]
  }
  return n2k_msgs
}

function setState(app, deviceid, command_json)
{
  var state = command_json["value"]
  app.debug("setState: " + state)
  return [util.format(state_commands[state], (new Date()).toISOString(), default_src, deviceid)]
}

function advanceWaypoint(app, deviceid, command_json)
{
  return [util.format(raymarine_ttw_Mode, (new Date()).toISOString(),
                      default_src, deviceid),
          util.format(raymarine_ttw, (new Date()).toISOString(),
                      default_src, deviceid)]
}

function silenceAlarm(app, deviceid, command_json)
{
  return [ util.format(raymarine_silence, (new Date()).toISOString(),
                     default_src, padd(command_json.value.alarmId.toString(16),2),
                     padd(command_json.value.groupId.toString(16),2)) ]
}

function sendCommand(app, deviceid, command_json)
{
  var n2k_msgs = null
  var action = command_json["action"]
  app.debug("command: %j", command_json)
  if ( action == "setState" )
  {
    n2k_msgs = setState(app, deviceid, command_json)
  }
  else if ( action == "changeHeading" )
  {
    n2k_msgs = changeHeading(app, deviceid, command_json)
  }
  else if ( action == 'advanceWaypoint' )
  {
    n2k_msgs = advanceWaypoint(app, deviceid, command_json)
  }
  else if ( action == "silenceAlarm" )
  {
    n2k_msgs = silenceAlarm(app, deviceid, command_json)
  }
  if ( n2k_msgs )
  {
    app.debug("n2k_msg: " + n2k_msgs)
    n2k_msgs.map(function(msg) { app.emit('nmea2000out', msg)})
  }
}

function radsToDeg(radians) {
  return radians * 180 / Math.PI
}

function degsToRad(degrees) {
  return degrees * (Math.PI/180.0);
}


