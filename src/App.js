import React, { Component } from 'react';
import { Button, Grid, Row, Col, PageHeader, FormControl } from 'react-bootstrap';
import "./App.css";

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
            chatInput: "",
            messages: []
        }

        this.rtc = new RTCPeerConnection();
        this.rtc.ondatachannel = this.onDataChannel.bind(this)
        this.rtc.onicecandidate = this.onicecandidate.bind(this)


        this.onUserInput = this.onUserInput.bind(this);
        this.createLocalDescription = this.createLocalDescription.bind(this);
        this.setRemoteDescription = this.setRemoteDescription.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.addMessage = this.addMessage.bind(this);
    }

    onicecandidate(e) {
        if (e.currentTarget.localDescription === "answer" && e.candidate)
            this.rtc.addIceCandidate(e.candidate)
    }

    onDataChannel(e) {
        this.receiveChatChannel = e.channel;
        this.receiveChatChannel.onopen = () => { this.setState({ receiveChatChannel: true }) };
        this.receiveChatChannel.onmessage = message => { this.addMessage({ me: false, content: message.data }) }
    }

    onUserInput(proxy) {
        this.setState({ [proxy.target.name]: proxy.target.value })
    }

    createLocalDescription() {
        this.sendChatChannel = this.rtc.createDataChannel("callerChannel");
        this.sendChatChannel.onopen = () => { this.setState({ sendChatChannel: true }) };

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
        this.sendChatChannel = this.rtc.createDataChannel("calleeChannel");
        this.sendChatChannel.onopen = () => { this.setState({ sendChatChannel: true }) };

        this.rtc.setRemoteDescription(JSON.parse(this.state.remoteDescription))
            .then(() => {
                this.setState({
                    remoteDescriptionIsSet: true,
                    remoteDescription: JSON.stringify(this.rtc.remoteDescription)
                })
                if (!this.state.localDescriptionIsSet)
                    this.rtc.createAnswer()
                        .then(answer => this.rtc.setLocalDescription(answer))
                        .then(() => {
                            this.setState({
                                localDescriptionIsSet: true,
                                localDescription: JSON.stringify(this.rtc.localDescription)
                            });
                        })
            })
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
                                create
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
                            <Button bsStyle="success" onClick={this.setRemoteDescription} disabled={this.state.remoteDescriptionIsSet}>apply</Button>
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
                {
                    this.state.receiveChatChannel && this.state.sendChatChannel ?
                        <div>
                            <Row>
                                <Col md={12}>
                                    <h3>
                                        Chat
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
                                        disabled={this.state.chatInput === ""}
                                        onClick={this.sendMessage}
                                    >
                                        SEND
                                    </Button>
                                </Col>
                            </Row>
                        </div>
                        : ""
                }
            </Grid>
        );
    }
}

export default App;
