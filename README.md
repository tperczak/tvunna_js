# tvunna.js

The library allows you to track visits and events on the website. Data on registered events are sent to the server using the MQTT websocet protocol. Any MQTT borker, e.g. Mosquitto, can be used as a server to receive data.

Because the MQTT protocol is bi-directional, the library allows you to receive feedback from the server in order to, e.g. personalize the page for the user.

You can also enable cookies. Then, if someone lands on your website, they are assigned a visit token and a visitor token. The visit token expires after 4 hours, in which a new visit is created. Visits are useful for tracking metrics like monthly active users. The visitor token expires after 2 years.


### Installation

Download and include on your page two libraries:

  * Eclipse Paho JavaScript Client

    <script src="mqttws31.min.js" type="text/javascript"></script>

  * and tvunna.js

    <script src="tvunna.min.js" type="text/javascript"></script>

### Configuration

Set: host, port, topic to send events, application id and usage of visit and visitor cookies.

    tvunna.configure({ host: "tvunna.io", //MQTT broker 
                       port: 8443, 
                       useSSL: true, 
                       topicIn: "tvunna/in", 
                       app_id: "demo-js", 
                       cookies: true, 
                     });

### Connect to the MQTT broker

    tvunna.MQTTconnect();

### Start track all events:

    tvunna.trackAll();

### Standard events

#### View

The event occurs once when the DOM (document object model) has been loaded and it is ready.

event_name: "$view"

    tvunna.trackView();

#### Click

An event occurs if the user clicks on the page any item from:

  * link, tag: _\<a>_
  * button, tag: _\<button>_
  * submit button, tag: _\<input type="submit">_

event_name: "$click"

    tvunna.trackClicks();

#### Submit

An event occurs when the form is submitted

event_name: "$submit"

    tvunna.trackSubmits();

#### Change

An event occurs when the user has changed any item from:

  * input, tag: _\<input>_
  * multi-line text input, tag: _\<textarea>_
  * drop-down list, tag: _\<select>_


event_name: "$change" 

    tvunna.trackChanges(); 

### Custom events 

Allows you to track any user-defined event. Required parameters: user-defined event name and any valid JSON with data. It can be used to add adapters to other systems. 

    tvunna.track(name, properties);

### Configure listening for arriving messages 

Set the configuration as below and add onMessageArrived callback function. 

    tvunna.configure({ topicOut: "tvunna/out", // topic to listen to arriving events 
                       listenTopicOut: true, 
                    }); 
  
    //onMessageArrived 
    function onMessageArrived(msg) { 
      console.log("Message received: ", msg.payloadString); 
    }; 

### Development 

Force a new visit 

    tvunna.reset(); // then reload the page 

Log messages 

    tvunna.debug(true); 

Turn off logging 

    tvunna.debug(false);
