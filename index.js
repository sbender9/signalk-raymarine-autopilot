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
const keys_code = {
    "+1":      "07,f8",
    "+10":     "08,f7",
    "-1":      "05,fa",
    "-10":     "06,f9",
    "-1-10":   "21,de",
    "+1+10":   "22,dd"
}
const raymarineAlarmGroupCodes = {
    "instrument": 0x00,
    "autopilot": 0x01,
    "radar": 0x02,
    "chartplotter": 0x03,
    "ais": 0x04
};
const alarmsId = {
    "NoAlarm": 0x0,
    "ShallowDepth": 0x1,
    "DeepDepth": 0x2,
    "ShallowAnchor": 0x3,
    "DeepAnchor": 0x4,
    "OffCourse": 0x5,
    "AWAHigh": 0x6,
    "AWALow": 0x7,
    "AWSHigh": 0x8,
    "AWSLow": 0x9,
    "TWAHigh": 0xa,
    "TWALow": 0xb,
    "TWSHigh": 0xc,
    "TWSLow": 0xd,
    "WPArrival": 0xe,
    "BoatSpeedHigh": 0xf,
    "BoatSpeedLow": 0x10,
    "SeaTempHigh": 0x11,
    "SeaTempLow": 0x12,
    "PilotWatch": 0x13,
    "PilotOffCourse": 0x14,
    "PilotWindShift": 0x15,
    "PilotLowBattery": 0x16,
    "PilotLastMinuteOfWatch": 0x17,
    "PilotNoNMEAData": 0x18,
    "PilotLargeXTE": 0x19,
    "PilotNMEADataError": 0x1a,
    "PilotCUDisconnected": 0x1b,
    "PilotAutoRelease": 0x1c,
    "PilotWayPointAdvance": 0x1d,
    "PilotDriveStopped": 0x1e,
    "PilotTypeUnspecified": 0x1f,
    "PilotCalibrationRequired": 0x20,
    "PilotLastHeading": 0x21,
    "PilotNoPilot": 0x22,
    "PilotRouteComplete": 0x23,
    "PilotVariableText": 0x24,
    "GPSFailure": 0x25,
    "MOB": 0x26,
    "Seatalk1Anchor": 0x27,
    "PilotSwappedMotorPower": 0x28,
    "PilotStandbyTooFastToFish": 0x29,
    "PilotNoGPSFix": 0x2a,
    "PilotNoGPSCOG": 0x2b,
    "PilotStartUp": 0x2c,
    "PilotTooSlow": 0x2d,
    "PilotNoCompass": 0x2e,
    "PilotRateGyroFault": 0x2f,
    "PilotCurrentLimit": 0x30,
    "PilotWayPointAdvancePort": 0x31,
    "PilotWayPointAdvanceStbd": 0x32,
    "PilotNoWindData": 0x33,
    "PilotNoSpeedData": 0x34,
    "PilotSeatalkFail1": 0x35,
    "PilotSeatalkFail2": 0x36,
    "PilotWarningTooFastToFish": 0x37,
    "PilotAutoDocksideFail": 0x38,
    "PilotTurnTooFast": 0x39,
    "PilotNoNavData": 0x3a,
    "PilotLostWaypointData": 0x3b,
    "PilotEEPROMCorrupt": 0x3c,
    "PilotRudderFeedbackFail": 0x3d,
    "PilotAutolearnFail1": 0x3e,
    "PilotAutolearnFail2": 0x3f,
    "PilotAutolearnFail3": 0x40,
    "PilotAutolearnFail4": 0x41,
    "PilotAutolearnFail5": 0x42,
    "PilotAutolearnFail6": 0x43,
    "PilotWarningCalRequired": 0x44,
    "PilotWarningOffCourse": 0x45,
    "PilotWarningXTE": 0x46,
    "PilotWarningWindShift": 0x47,
    "PilotWarningDriveShort": 0x48,
    "PilotWarningClutchShort": 0x49,
    "PilotWarningSolenoidShort": 0x4a,
    "PilotJoystickFault": 0x4b,
    "PilotNoJoystickData": 0x4c,
    "notassigned": 0x4d,
    "notassigned": 0x4e,
    "notassigned": 0x4f,
    "PilotInvalidCommand": 0x50,
    "AISTXMalfunction": 0x51,
    "AISAntennaVSWRfault": 0x52,
    "AISRxchannel1malfunction": 0x53,
    "AISRxchannel2malfunction": 0x54,
    "AISNosensorpositioninuse": 0x55,
    "AISNovalidSOGinformation": 0x56,
    "AISNovalidCOGinformation": 0x57,
    "AIS12Valarm": 0x58,
    "AIS6Valarm": 0x59,
    "AISNoisethresholdexceededchannelA": 0x5a,
    "AISNoisethresholdexceededchannelB": 0x5b,
    "AISTransmitterPAfault": 0x5c,
    "AIS3V3alarm": 0x5d,
    "AISRxchannel70malfunction": 0x5e,
    "AISHeadinglost/invalid": 0x5f,
    "AISinternalGPSlost": 0x60,
    "AISNosensorposition": 0x61,
    "AISLockfailure": 0x62,
    "AISInternalGGAtimeout": 0x63,
    "AISProtocolstackrestart": 0x64,
    "PilotNoIPScommunications": 0x65,
    "PilotPower-OnorSleep-SwitchResetWhileEngaged": 0x66,
    "PilotUnexpectedResetWhileEngaged": 0x67,
    "AISDangerousTarget": 0x68,
    "AISLostTarget": 0x69,
    "AISSafetyRelatedMessage(usedtosilence)": 0x6a,
    "AISConnectionLost": 0x6b,
    "NoFix": 0x6c
};
const key_command = "%s,7,126720,%s,%s,22,3b,9f,f0,81,86,21,%s,ff,ff,ff,ff,ff,c1,c2,cd,66,80,d3,42,b1,c8"
const heading_command = "%s,3,126208,%s,%s,14,01,50,ff,00,f8,03,01,3b,07,03,04,06,%s,%s"
const wind_direction_command = "%s,3,126208,%s,%s,14,01,41,ff,00,f8,03,01,3b,07,03,04,04,%s,%s"
const raymarine_ttw_Mode = "%s,3,126208,%s,%s,17,01,63,ff,00,f8,04,01,3b,07,03,04,04,81,01,05,ff,ff"
const raymarine_ttw = "%s,3,126208,%s,%s,21,00,00,ef,01,ff,ff,ff,ff,ff,ff,04,01,3b,07,03,04,04,6c,05,1a,50"

const raymarine_silence =  "%s,7,65361,%s,255,8,3b,9f,%s,%s,00,00,00,00"

const keep_alive = "%s,7,65384,%s,255,8,3b,9f,00,00,00,00,00,00"
const keep_alive2 = "%s,7,126720,%s,255,7,3b,9f,f0,81,90,00,03"

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
  var timers = []
  
  plugin.start = function(props) {
    deviceid = props.deviceid

    if ( props.controlHead ) {
      timers.push(setInterval(() => {
        const msg = util.format(keep_alive, (new Date()).toISOString(),
                                default_src)
        app.emit('nmea2000out', msg)
      }, 1000))
      
      timers.push(setInterval(() => {
        const msg = util.format(keep_alive2, (new Date()).toISOString(),
                                default_src)
        console.log('sending keep_alive: ' + msg)
        app.emit('nmea2000out', msg)
      }, 2000))
    }
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
    timers.forEach(timer => {
      clearInterval(timer)
    })
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
      },
      controlHead: {
        type: 'boolean',
        title: 'Act as the p70 control head (WARNING: unknown consequences)',
        default: false
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

function tackTo(app, deviceid, command_json)
{
  var tackTo = command_json["value"]
  app.debug("tackTo: " + tackTo)
  if (tackTo === "port")
  {
    return [util.format(key_command, (new Date()).toISOString(), default_src, everyone_dst, keys_code["-1-10"])]
  }
  else if (tackTo === "starboard")
  {
    return [util.format(key_command, (new Date()).toISOString(), default_src, everyone_dst, keys_code["+1+10"])]
  }
  else
  {
    app.debug("tackTo: unknown " + tackTo)
  }
}

function changeHeadingByKey(app, deviceid, command_json)
{
  var key = command_json["value"]
  app.debug("changeHeadingByKey: " + key)
  return [util.format(key_command, (new Date()).toISOString(), default_src, everyone_dst, keys_code[key])]
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
  if (typeof command_json.value.signalkPath !== 'undefined') {
    var path = command_json.value.signalkPath.split('.')
    if (path.length > 1) {
      var groupId = raymarineAlarmGroupCodes[path[path.length - 2]] || -1
      var alarmId = alarmsId[path[path.length - 1]] || -1
      if ((groupId !== -1) && (alarmId !== -1)) {
        command_json.value.groupId = groupId
        command_json.value.alarmId = alarmId
      }
    }
  }
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
  else if ( action == "tackTo" )
  {
    n2k_msgs = tackTo(app, deviceid, command_json)
  }
  else if ( action == "changeHeadingByKey" )
  {
    n2k_msgs = changeHeadingByKey(app, deviceid, command_json)
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


