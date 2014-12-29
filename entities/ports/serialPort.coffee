serialPort = require 'serialport'
{SerialPort} = serialPort
uuid = require 'node-uuid'
Bacon = require 'baconjs'

serial = (data, callback) ->
  {comName, baudRate} = data
  baudRate ?= 9600
  port = new SerialPort comName, baudRate: baudRate, (err) ->
    if err then callback err
    port.info =
      id: uuid.v4()
      comName: comName
      baudRate: baudRate
      opened: +new Date()
      type: 'serial'
    port.getReadStream = ->
      Bacon.fromEventTarget port, 'data'
    callback null, port

serial.list = (callback) ->
  serialPort.list callback

module.exports = serial
