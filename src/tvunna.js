/*
 * tvunna.js
 * MQTT, powerful JavaScript analytics
 * v0.0.4
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.tvunna = factory());
}(this, (function(){ 'use strict';


  var config = {
    host: "tvunna.io",          // MQTT broker
    port: 8443,                 // port
    useSSL: true,               // use SSL (true/false)
    timeout: 3,                 // if the connect has not succeeded within the number of seconds, it is deemed to have failed
    reconnectTimeout: 2,        // next attempt to reconnect after the number of seconds
    qos: 0,                     // the Quality of Service used to deliver the message (0-best effort (default), 1-at least once, 2-exactly once)
    topicIn: "tvunna/in",       // topic to send events
    topicOut: "tvunna/out",     // topic to listen to arriving events, only used if listenTopicOut is set to true
    listenTopicOut: false,      // if listen to arriving messages
    cookies: true,              // usage of visit and visitor cookies (true/false)
    cookiesGenerate: false,     // generation of new cookies by tvunna.js if they do not exist (true/false)
    app_id: "demo-js",          // application id
    event_type: "js",           // event type
    event_type_custom: "js-api" // event type for custom event
  };

  var tvunna = window.tvunna || window.Tvunna || {};
  var mqtt;
  var eventQueue = [];
  var visitId, visitorId;
  var visitTtl = 0.5 * 60; // 0.5 hour
  var visitorTtl = 2 * 365 * 24 * 60; // 2 years
  var mqtt_client_id = "js-"+(Math.random().toString(36)+"000000000000").substr(2,11);


  // Cookies
  // https://www.quirksmode.org/js/cookies.html
  var Cookies = {
    set: function (name, value, ttl, domain) {
      var expires = "";
      var cookieDomain = "";
      if (ttl) {
        var date = new Date();
        date.setTime(date.getTime() + (ttl * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
      }
      if (domain) {
        cookieDomain = "; domain=" + domain;
      }
      document.cookie = name + "=" + escape(value) + expires + cookieDomain + "; SameSite=None; Secure; path=/";
    },
    get: function (name) {
      var i, c;
      var nameEQ = name + "=";
      var ca = document.cookie.split(';');
      for (i = 0; i < ca.length; i++) {
        c = ca[i];
        while (c.charAt(0) === ' ') {
          c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) === 0) {
          return unescape(c.substring(nameEQ.length, c.length));
        }
      }
      return null;
    }
  };


  // Cookies
  tvunna.setCookie = function (name, value, ttl) {
    Cookies.set(name, value, ttl, config.cookieDomain || config.domain);
  }


  tvunna.getCookie = function (name) {
    return Cookies.get(name);
  }


  tvunna.destroyCookie = function (name) {
    Cookies.set(name, "", -1);
  }


  function log(message) {
	if (tvunna_debug) {
      window.console.log(message);
    }
  }


  // Configure
  tvunna.configure = function (options) {
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        config[key] = options[key];
      }
    }
  };


  // Set default configuration
  tvunna.configure(tvunna);


  // tvunna_debug
  var tvunna_debug = tvunna.getCookie("tvunna_debug");


  //MQTT JS
  //https://www.eclipse.org/paho/clients/js/
  tvunna.MQTTconnect = function() {
    var clientId = mqtt_client_id;
    var options = {
      useSSL: config.useSSL,
      timeout: config.timeout,
      onSuccess: onConnect,
      onFailure: onFailure
    };

    log("connecting to: " + config.host + ":" + config.port + ", clientId: "+ clientId);

    mqtt = new Paho.MQTT.Client(config.host, config.port, clientId);

    if (config.listenTopicOut) {
      mqtt.onMessageArrived = onMessageArrived;
    }
    mqtt.onConnectionLost = onConnectionLost;
    mqtt.connect(options); //connect
  };


  //Called once a connection has been made
  function onConnect() {
    log("Connected");

    //Make a subscription for arriving messages
    if (config.listenTopicOut) {
      mqtt.subscribe(config.topicOut);
    }

    //Send enqueued messages
    while (eventQueue.length != 0) {
     sendMessageNow(eventQueue.shift());
    }
  }


  //Called when the client cannot connect for the first time
  function onFailure(message) {
    log("Connection Attempt to Host " + config.host + " Failed");
    setTimeout(tvunna.MQTTconnect, config.reconnectTimeout*1000);
  }


  //Called when the client loses its connection
  function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
      log("onConnectionLost:" + responseObject.errorMessage);
    }
    tvunna.MQTTconnect();
  }


  function sendMessageNow(msg) {
     setTimeout(function(){
         var message = new Paho.MQTT.Message(msg);
          message.destinationName = config.topicIn;
          message.qos = config.qos;
          mqtt.send(message);
          log("Message sent to : " + config.host  +":" + config.port + " : " + msg);
      }, 0);
  }


  function sendMessage(eventData) {
    var msg = JSON.stringify(eventData);
    if (mqtt.isConnected()) {
      //send event now
      sendMessageNow(msg);
    } else {
      //put event to queue
      eventQueue.push(msg);
    }
  }


  // https://stackoverflow.com/a/2117523/1177228
  var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }
  function generateId()
  {
    var d0 = Math.random()*0xffffffff|0;
    var d1 = Math.random()*0xffffffff|0;
    var d2 = Math.random()*0xffffffff|0;
    var d3 = Math.random()*0xffffffff|0;
    return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
    lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
    lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
    lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
  }


  // http://beeker.io/jquery-document-ready-equivalent-vanilla-javascript
  function documentReady(callback) {
    document.readyState === "interactive" || document.readyState === "complete" ? callback() : document.addEventListener("DOMContentLoaded", callback);
  }


  function presence(str) {
    return (str && str.length > 0) ? str : null;
  }


  function getClosestSection(element) {
    for ( ; element && element !== document; element = element.parentNode) {
      if (element.hasAttribute('data-section')) {
        return element.getAttribute('data-section');
      }
    }
    return null;
  }


  function matchesSelector(element, selector) {
    var matches = element.matches ||
      element.matchesSelector ||
      element.mozMatchesSelector ||
      element.msMatchesSelector ||
      element.oMatchesSelector ||
      element.webkitMatchesSelector;

    if (matches) {
      return matches.apply(element, [selector]);
    } else {
      log('log("Unable to match")');
      return false;
    }
  }


  function onEvent(eventName, selector, callback) {
    document.addEventListener(eventName, function (e) {
      if (matchesSelector(e.target, selector)) {
        callback(e);
      }
    });
  }


  function eventData(name, properties) {
    if (config.cookies === false ) {
      log("Visit tracking disabled");
      visitId = null;
      visitorId = null;
    } else {
      if (!visitId) {
        visitId = tvunna.getCookie("tvunna_visit");
      }
      if (!visitorId) {
        visitorId = tvunna.getCookie("tvunna_visitor");
      }

      if (visitId && visitorId) {
        log("Active visit");
      }	else {
          if (!visitId && config.cookiesGenerate) {
            visitId = generateId();
            tvunna.setCookie("tvunna_visit", visitId, visitTtl);
         }
         // make sure cookies are enabled
         if (tvunna.getCookie("tvunna_visit")) {
           log("Visit started");

           if (!visitorId && config.cookiesGenerate) {
              visitorId = generateId();
              tvunna.setCookie("tvunna_visitor", visitorId, visitorTtl);
           }
         } else {
           log("Cookies disabled");
         }
      }
    }

    var data = {
      app_id: config.app_id,
      event_id: generateId(),
      event_name: name,
      sent_tstamp: new Date(),
      visit_id: visitId,
      visitor_id: visitorId,
      landing_page: window.location.href,
      //screen_width: window.screen.width,
      //screen_height: window.screen.height,
      title: presence(document.title),
      referrer: presence(document.referrer),
      user_agent: navigator.userAgent,
      href: null,
      tag: null,
      id: null,
      text: null,
      class_name: null,
      section: null,
      properties: properties || {},
      mqtt_client_id: mqtt_client_id
    };
    return data;
  }


  tvunna.reset = function () {
    tvunna.destroyCookie("tvunna_visit");
    tvunna.destroyCookie("tvunna_visitor");
    return true;
  };


  tvunna.debug = function (enabled) {
    if (enabled === false) {
      tvunna.destroyCookie("tvunna_debug");
    } else {
      tvunna.setCookie("tvunna_debug", "t", 365 * 24 * 60); // 1 year
    }
      tvunna_debug = tvunna.getCookie("tvunna_debug");
    return true;
  };


  tvunna.track = function (name, properties) {
    var data = eventData(name, properties);
    data.event_type = config.event_type_custom;
    log("tvunna.track");
    //log(data);
    sendMessage(data);
    return true;
  };


  tvunna.trackView = function () {
    documentReady(function() {
       var data = eventData("pageView");
       data.event_type = config.event_type;
       log("tvunna.trackView");
       //log(data);
       sendMessage(data);
    });
  };


  tvunna.trackClicks = function () {
    onEvent("click", "a, button, input[type=submit], img", function (e) {
      var target = e.target;
      var data = eventData("click");
      data.event_type = config.event_type;
      data.tag = presence(target.tagName.toLowerCase());
      if (data.tag == "img") {
        data.href = presence(target.parentNode.href);
        data.properties = target.parentNode.dataset;
      }
      else {
        data.href = presence(target.href);
        data.properties = target.dataset;
      }
      data.id = presence(target.id);
      data.text = presence(data.tag == "input" ? target.value : (target.textContent || target.innerText || target.innerHTML).replace(/[\s\r\n]+/g, " ").trim());
      data.class_name = presence(target.className);
      data.section = getClosestSection(target);
      log("tvunna.trackClicks");
      //log(data);
      sendMessage(data);
    });
  };


  tvunna.trackSubmits = function () {
    onEvent("submit", "form", function (e) {
      var target = e.target;
      var data = eventData("submit");
      data.event_type = config.event_type;
      data.href = presence(target.href);
      data.tag = presence(target.tagName.toLowerCase());
      data.id = presence(target.id);
      data.class_name = presence(target.className);
      data.section = getClosestSection(target);
      log("tvunna.trackSubmits");
      //log(data);
      sendMessage(data);
    });
  };


  tvunna.trackChanges = function () {
    onEvent("change", "input, textarea, select", function (e) {
      var target = e.target;
      var data = eventData("change");
      data.event_type = config.event_type;
      data.href = presence(target.href);
      data.tag = presence(target.tagName.toLowerCase());
      data.id = presence(target.id);
      data.text = presence(data.tag == "input" ? target.value : (target.textContent || target.innerText || target.innerHTML).replace(/[\s\r\n]+/g, " ").trim());
      data.class_name = presence(target.className);
      data.section = getClosestSection(target);
      log("tvunna.trackChanges");
      //log(data);
      sendMessage(data);
    });
  };


  tvunna.trackAll = function() {
    tvunna.trackView();
    tvunna.trackClicks();
    tvunna.trackSubmits();
    tvunna.trackChanges();
  };


  return tvunna;

})));
