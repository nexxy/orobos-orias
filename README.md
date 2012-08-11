# OROBOS-ORIAS (Device Monitor)
__physical security & monitoring client for node.js & arduino__

_Presented here is the code that operates the device (client) portion of the physical security system I am implementing at [Casa Diablo](http://casadiablo.com)._

_Current functionality is extremely limited, but provides the foundation for binary status triggers. Also included is heartbeat monitoring that will trigger the alarm when a device monitor goes offline or loses the serial connection to an arduino._

_I have provided the arduino sketches for both a (single) magnetic door switch (with support for multiples coming soon...), and an ultrasonic sensor, although the ultrasonic sensor is still prone to false-positives._


----------

## Command-line Options:

`node ./index.js --host <remote host> --port <remote port> --device <device path> --id <device ID>`

### Details:
  * `--host` [required] (remote host (running [orobos-vine](https://github.com/nexxy/orobos-vine/) orobos-vine daemon))
  * `--port` [required] (remote port to connect on)
  * `--device` [required] (device path to the arduino (e.g. `/dev/ttyACM0`))
  * `--id` [required] (device identifier, useful for multiple alarm "zones")

----------

## Dependencies:

 * optimist
 * dnode
 * buffertools
 * serialport

----------

## Arduino Sketches:

 * [open/closed circuit trigger](https://gist.github.com/3322493) (for use with something like [magnetic door switches](http://amzn.to/PLw41G))
