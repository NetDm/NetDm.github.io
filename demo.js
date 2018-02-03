function createUA(callerURI, displayName) {

    var configuration = {
        traceSip: true,
        uri: callerURI,
        displayName: displayName
    };
    var userAgent = new SIP.UA(configuration);
    return userAgent;
}    

function setUpMessageInterface(userAgent, target, messageRenderId, messageInputId, buttonId) {
    var messageRender = document.getElementById(messageRenderId);
    var messageInput = document.getElementById(messageInputId);
    var button = document.getElementById(buttonId);

    function sendMessage() {
        var msg = messageInput.value;
        if (msg !== '') {
            messageInput.value = '';
            userAgent.message(target, msg);
        }
    }

    var noMessages = true;

    userAgent.on('message', function (msg) {
        if (noMessages) {
            noMessages = false;
            if (messageRender.childElementCount > 0)
                messageRender.removeChild(messageRender.children[0]);
        }
        var msgTag = createMsgTag(msg.remoteIdentity.displayName, msg.body);
        messageRender.appendChild(msgTag);
    });

    button.addEventListener('click', function () {
        sendMessage();
    });
    messageInput.onkeydown = (function(e) {
        if(e.keyCode == 13 && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

function createMsgTag(from, msgBody) {
    var msgTag = document.createElement('p');
    msgTag.className = 'message';

    var fromTag = document.createElement('span');
    fromTag.appendChild(document.createTextNode(from + ':'));

    var msgBodyTag = document.createElement('span');
    msgBodyTag.appendChild(document.createTextNode(' ' + msgBody));
    msgTag.appendChild(fromTag);
    msgTag.appendChild(msgBodyTag);
    return msgTag;
}

function mediaOptions(audio, video, remoteRender, localRender) {
    return {
        media: {
            constraints: {
                audio: audio,
                video: video
            },
            render: {
                remote: remoteRender,
                local: localRender
            }
        }
    };
}

function makeCall(userAgent, target, audio, video, remoteRender, localRender) {
    var options = mediaOptions(audio, video, remoteRender, localRender);
    var session = userAgent.invite('sip:' + target, options);
    return session;
}

function setUpVideoInterface(userAgent, target, remoteRenderId, buttonId) {
    var onCall = false;
    var session;
    var remoteRender = document.getElementById(remoteRenderId);
    var button = document.getElementById(buttonId);

    userAgent.on('invite', function (incomingSession) {
        onCall = true;
        session = incomingSession;
        var options = mediaOptions(true, true, remoteRender, null);		//allow voice and video
        button.firstChild.nodeValue = 'hang up';
        session.accept(options);
        session.on('bye', function () {
            onCall = false;
            button.firstChild.nodeValue = 'video';
            session = null;
        });
    });

    button.addEventListener('click', function () {
        if (onCall) {
            onCall = false;
            button.firstChild.nodeValue = 'video';
            session.bye();
            session = null;
        }
        else {
            onCall = true;
            button.firstChild.nodeValue = 'hang up';
            session = makeCall(userAgent, target,
                               true, true,					//allow voice and video
                               remoteRender, null);
            session.on('bye', function () {
                onCall = false;
                button.firstChild.nodeValue = 'video';
                session = null;
            });
        }
    });
}

//****************************

(function () {
if (SIP.WebRTC.isSupported()) {
    window.fromUA = createUA(fromURI, fromName);

    var registrationFailed = false;
    var failRegistration = function () {
        registrationFailed = true;
        failInterfaceSetup();
    };

    fromUA.on('registered', setupInterfaces);
    fromUA.on('registrationFailed', failRegistration);
    window.onunload = function () {
        fromUA.stop();
    };

    function setupInterfaces() {
        setUpVideoInterface(fromUA, toURI, 'video', 'video-button');
        setUpMessageInterface(fromUA, toURI, 'message-display', 'message-input', 'message-button');
    }
    function failInterfaceSetup() {
        alert('Max registration limit hit. The app is disabled.');
    }
}
})();
