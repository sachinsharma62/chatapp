import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, query, onSnapshot, addDoc, orderBy, serverTimestamp, updateDoc, doc, arrayUnion, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, ListGroup, Form, Button, Card, Dropdown, Modal } from "react-bootstrap";
import { FaUserPlus } from "react-icons/fa";
import { BsSendFill } from "react-icons/bs";
import { FiArrowLeft } from "react-icons/fi";
import '../styles/chatpage.css'

const ChatPage = () => {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const contacts = docSnap.data().contacts || [];
        const usersRef = collection(db, "users");

        onSnapshot(usersRef, (snapshot) => {
          const allUsersList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setAllUsers(allUsersList);
          const filteredUsers = allUsersList.filter((user) => contacts.includes(user.uid));
          setUsers(filteredUsers);
        });
      }
    });
  }, [currentUser]);

  useEffect(() => {
    if (selectedUser) {
      const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
      const messagesRef = collection(db, "chats", chatId, "messages");
      const q = query(messagesRef, orderBy("timestamp", "asc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      });

      return () => unsubscribe();
    }
  }, [selectedUser, currentUser]);

  const addContact = async (userId) => {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      contacts: arrayUnion(userId),
    });
  };
 const deleteMessage = async (messageId, forEveryone = false) => {
    const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
    const messageRef = doc(db, "chats", chatId, "messages", messageId);
    const messageSnap = await getDoc(messageRef);

    if (!messageSnap.exists()) return;

    if (forEveryone && messageSnap.data().sender === currentUser.uid) {
      await updateDoc(messageRef, {
        text: "This message was deleted",
        deletedFor: [currentUser.uid, selectedUser.uid],
      });
    } else {
      await updateDoc(messageRef, {
        deletedFor: arrayUnion(currentUser.uid),
      });
    }
  };

  const sendMessage = async (e) => {
   e.preventDefault();
   if (newMessage.trim() === "") return;
 
   const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
   const messagesRef = collection(db, "chats", chatId, "messages");
 
   const messageToSend = newMessage;  // ताकि डाटा सेव होने से पहले ही इनपुट बॉक्स क्लियर हो जाए
   setNewMessage("");  // इनपुट बॉक्स तुरंत क्लियर करने के लिए
 
   await addDoc(messagesRef, {
     sender: currentUser.uid,
     text: messageToSend,
     timestamp: serverTimestamp(),
     seenBy: [],
     replyTo: replyTo ? replyTo.id : null,
     deletedFor: [],
   });
 
   setReplyTo(null);
 };
 

  return (
    <Container fluid className="vh-100 d-flex flex-column">
      <Card className="p-3 bg-primary text-white d-flex flex-row justify-content-between align-items-center">
        <h5>Chat App</h5>
        <Button variant="danger" size="sm" onClick={() => signOut(auth).then(() => navigate("/login"))}>
          Logout
        </Button>
      </Card>

      <Row className="flex-grow-1 height-custom">
        {/* Sidebar */}
        {!selectedUser || !isMobile ? (
          <Col md={3} className="border-end bg-light p-3 d-flex flex-column sidebar">
            <h6 className="text-center">Contacts</h6>
            <Button variant="success" className="mb-2" onClick={() => setShowAddContactModal(true)}>
              <FaUserPlus /> Add Contact
            </Button>
            <ListGroup className="flex-grow-1 overflow-auto">
              {users.map((user) => (
                <ListGroup.Item key={user.id} action onClick={() => setSelectedUser(user)} className="text-center">
                  {user.name}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Col>
        ) : null}

        {selectedUser && (
                  <Col md={9} className="d-flex flex-column chat-section">
                    <Card className="p-3 bg-primary text-white d-flex flex-row justify-content-between align-items-center">
                      {isMobile && (
                        <Button variant="light" size="sm" onClick={() => setSelectedUser(null)}>
                          <FiArrowLeft />
                        </Button>
                      )}
                      <h5 className="m-0">{selectedUser.name}</h5>
                    </Card>
        
                    <div className="flex-grow-1 overflow-auto p-3 chat-messages">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`d-flex ${msg.sender === currentUser.uid ? "justify-content-end" : "justify-content-start"}`}>
                          {!msg.deletedFor?.includes(currentUser.uid) ? (
                            <>
                              <Dropdown>
                                <Dropdown.Toggle variant="light" size="sm" />
                                <Dropdown.Menu>
                                  <Dropdown.Item onClick={() => deleteMessage(msg.id, false)}>Delete for Me</Dropdown.Item>
                                  {msg.sender === currentUser.uid && (
                                    <Dropdown.Item onClick={() => deleteMessage(msg.id, true)}>Delete for Everyone</Dropdown.Item>
                                  )}
                                  <Dropdown.Item onClick={() => setReplyTo(msg)}>Reply</Dropdown.Item>
                                </Dropdown.Menu>
                              </Dropdown>
                              <p className={`p-2 rounded ${msg.sender === currentUser.uid ? "bg-primary text-white" : "bg-light text-dark"}`}>
                                {msg.replyTo && <small className="d-block text-muted">Replying to: {messages.find(m => m.id === msg.replyTo)?.text || "Deleted Message"}</small>}
                                {msg.text}
                              </p>
                            </>
                          ) : (
                            <p className="text-muted fst-italic">This message was deleted</p>
                          )}
                        </div>
                      ))}
                    </div>
        
                    <Form onSubmit={sendMessage} className="p-3 border-top d-flex">
                      <Form.Control type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." />
                      <Button type="submit" variant="primary" className="ms-2">
                        <BsSendFill />
                      </Button>
                    </Form>
                  </Col>
                )}
      </Row>

      {/* Add Contact Modal */}
      <Modal show={showAddContactModal} onHide={() => setShowAddContactModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Contact</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup>
            {allUsers
              .filter((user) => user.uid !== currentUser.uid && !users.some((u) => u.uid === user.uid))
              .map((user) => (
                <ListGroup.Item key={user.id} className="d-flex justify-content-between align-items-center">
                  {user.name}
                  <Button variant="success" size="sm" onClick={() => addContact(user.uid)}>
                    Add
                  </Button>
                </ListGroup.Item>
              ))}
          </ListGroup>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default ChatPage;
