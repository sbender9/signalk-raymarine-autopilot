# signalk-raymarine-autopilot

[![Greenkeeper badge](https://badges.greenkeeper.io/sbender9/signalk-raymarine-autopilot.svg)](https://greenkeeper.io/)


# API

All messages to plugin are done as POST requests which take a map as input in the form:

```json
{
  "action": "someAction",
  "value": 10
}
```

The POST should be sent to `/plugins/raymarineautopilot/command`

## Advance Waypoint
```json
{
  "action": "advanceWaypoint"
}
```

## Set Autopilot State

The `value` can be `auto`, `wind`, `route`, or `standby`

```json
{
  "action": "setState",
  "value": "auto"
}
```

## Change Target Heading or Wind Angle

The `value` is in degrees and is the amount to change. So when in `auto` at a heading of 180, a value of `-10` will change the target heading would be changed to `170`

```json
{
  "action": "changeHeading",
  "value": 1
}
```
