import React, { Component } from 'react';
import { Button, Grid, Row, Col, PageHeader, FormControl } from 'react-bootstrap';
import "./App.css";

const videoConstraints = {
    audio: true,
    video: { width: 1280, height: 720 }
}

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            localDescription: "",
            remoteDescription: "",
            localDescriptionIsSet: false,
            remoteDescriptionIsSet: false,
            receiveChatChannel: false,
            sendChatChannel: false,
            sendChatChannelPending: false,
            videoChatIsStarted: false,
            chatInput: "",
            messages: [],
            localVideoStream: null
        }

        this.rtc = new RTCPeerConnection({
            iceServers: [
                {
                    'urls': 'stun:stun.l.google.com:19302'
                }
            ]
        });
        this.rtc.ondatachannel = this.onDataChannel.bind(this)
        this.rtc.onicecandidate = this.onicecandidate.bind(this)
        this.rtc.onaddstream = this.onAddStream.bind(this)
        this.rtc.onnegotiationneeded = this.onNegotiationNeeded.bind(this);


        this.onUserInput = this.onUserInput.bind(this);
        this.createLocalDescription = this.createLocalDescription.bind(this);
        this.setRemoteDescription = this.setRemoteDescription.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.addMessage = this.addMessage.bind(this);
        this.createChatChannel = this.createChatChannel.bind(this);
        this.createVideoChannel = this.createVideoChannel.bind(this);
        this.isCaller = this.isCaller.bind(this);
        this.createAnswer = this.createAnswer.bind(this);
    }

    onNegotiationNeeded(event) {
        if (!this.isCaller())
            return;

        this.rtc.createOffer()
            .then(offer => this.rtc.setLocalDescription(offer))
            .then(() => {
                this.setState({ localDescription: JSON.stringify(this.rtc.localDescription) })
            })
    }



    onAddStream(event) {
        this.applyStream("remoteStream", event.stream)
    }

    onicecandidate(e) {
        switch (e.type) {
            case "icecandidate":
                if (e.currentTarget.localDescription === "answer" && e.candidate)
                    this.rtc.addIceCandidate(e.candidate)
                break;
            case "addstream":
                console.log(e)
                this.applyStream("remoteStream", e.stream);
                break;
        }
    }

    onDataChannel(e) {
        console.log(e)
        this.receiveChatChannel = e.channel;
        this.receiveChatChannel.onopen = () => { this.setState({ receiveChatChannel: true }) };
        this.receiveChatChannel.onmessage = message => { this.addMessage({ me: false, content: message.data }) }
    }

    createLocalDescription() {
        this.rtc.createOffer()
            .then(offer => {
                this.rtc.setLocalDescription(offer);
                this.setState({
                    localDescriptionIsSet: true,
                    localDescription: JSON.stringify(this.rtc.localDescription)
                });
            })
    }

    setRemoteDescription() {
        this.rtc.setRemoteDescription(JSON.parse(this.state.remoteDescription))
            .then(() => {
                this.setState({
                    remoteDescriptionIsSet: true,
                    remoteDescription: JSON.stringify(this.rtc.remoteDescription)
                })
                if (!this.isCaller()) {
                    this.createAnswer()
                }
            })
    }

    createAnswer() {
        this.rtc.createAnswer()
            .then(answer => this.rtc.setLocalDescription(answer))
            .then(() => {
                this.setState({
                    localDescriptionIsSet: true,
                    localDescription: JSON.stringify(this.rtc.localDescription)
                });
            })
    }

    onUserInput(proxy) {
        this.setState({ [proxy.target.name]: proxy.target.value })
    }




    sendMessage() {
        this.addMessage({
            me: true,
            content: this.state.chatInput
        })
        this.sendChatChannel.send(this.state.chatInput)
        this.setState({ chatInput: "" })
    }

    addMessage(message) {
        this.setState({
            messages: [
                ...this.state.messages,
                message
            ]
        })
    }

    applyStream(id, stream) {
        var video = document.getElementById(id);
        if(id === "localStream"){
            video.volume = 0;
        }
        video.srcObject = stream;
        video.onloadedmetadata = function (e) {
            video.play();
        };
    }

    createChatChannel() {
        this.sendChatChannel = this.rtc.createDataChannel(this.isCaller() ? "callerChatChannel" : "calleeChatChannel");
        this.setState({ sendChatChannelPending: true })
        this.sendChatChannel.onopen = () => { this.setState({ sendChatChannel: true }) };
    }

    createVideoChannel() {
        this.setState({ videoChatIsStarted: true })
        navigator.mediaDevices.getUserMedia(videoConstraints)
            .then(
                stream => {
                    this.applyStream("localStream", stream)
                    stream.getTracks().forEach(track => this.rtc.addTrack(track, stream));
                }
            )
    }
    isCaller() {
        return this.rtc.localDescription.type === "offer";
    }

    render() {
        return (
            <Grid>
                <Row>
                    <Col>
                        <PageHeader>
                            WebRTC
                        </PageHeader>
                    </Col>
                </Row>
                <hr />
                <Row>
                    <Col>
                        <h3>
                            Local Description
                            {" "}
                            <Button
                                bsStyle="primary"
                                disabled={this.state.localDescriptionIsSet}
                                onClick={this.createLocalDescription}
                            >
                                CREATE
                            </Button>
                        </h3>
                    </Col>
                </Row>
                <Row>
                    <textarea
                        className="descriptionTextArea"
                        onChange={this.onUserInput}
                        name="localDescription"
                        value={this.state.localDescription}
                    />
                </Row>
                <hr />
                <Row>
                    <Col>
                        <h3>
                            Remote Description
                            {" "}
                            <Button bsStyle="success" onClick={this.setRemoteDescription}>APPLY</Button>
                        </h3>
                    </Col>
                </Row>
                <Row>
                    <textarea
                        className="descriptionTextArea"
                        onChange={this.onUserInput}
                        name="remoteDescription"
                        value={this.state.remoteDescription}
                    />
                </Row>
                <hr />
                <div>
                    <Row>
                        <Col md={12}>
                            <h3>
                                Chat
                                {" "}
                                <Button
                                    bsStyle="primary"
                                    onClick={this.createChatChannel}
                                    disabled={this.state.sendChatChannel || this.state.sendChatChannelPending}
                                >
                                    CREATE
                                </Button>
                            </h3>
                            <div className="chatWrapper">
                                {
                                    this.state.messages.map(
                                        (message, i) =>
                                            <Row key={`chatMessage-${i}`}>
                                                <Col md={12}>
                                                    <div className={message.me ? "senderMe" : "senderYou"}>
                                                        {message.content}
                                                    </div>
                                                </Col>
                                            </Row>
                                    )
                                }
                            </div>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={10}>
                            <FormControl
                                type="text"
                                name="chatInput"
                                value={this.state.chatInput}
                                placeholder="Enter a message"
                                onChange={this.onUserInput}
                            />
                        </Col>
                        <Col md={2}>
                            <Button
                                bsStyle="primary"
                                disabled={this.state.chatInput === "" || !this.state.sendChatChannel}
                                onClick={this.sendMessage}
                            >
                                SEND
                            </Button>
                        </Col>
                    </Row>
                </div>
                <div>
                    <hr />
                    <Row>
                        <Col md={12}>
                            <h3>
                                Video Chat
                                {" "}
                                <Button
                                    bsStyle="primary"
                                    onClick={this.createVideoChannel}
                                    disabled={this.state.videoChatIsStarted}
                                >
                                    CREATE
                                </Button>
                            </h3>
                            <div className="videoWrapper">
                                <video id="remoteStream" />
                                <video id="localStream" />
                            </div>
                        </Col>
                    </Row>
                </div>
            </Grid>
        );
    }
}

export default App;
