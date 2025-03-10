import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, query, onSnapshot, addDoc, orderBy, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, getDoc, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, ListGroup, Form, Button, Card, Dropdown } from "react-bootstrap";
import { FaEllipsisV, FaTrash, FaUserMinus } from "react-icons/fa";
import { BsSendFill } from "react-icons/bs";

const ChatPage = () => {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

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

  const removeContact = async (userId) => {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      contacts: arrayRemove(userId),
    });
    setUsers(users.filter(user => user.uid !== userId));
    setSelectedUser(null);
  };

  const deleteChat = async () => {
    if (!selectedUser) return;
    const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
    const messagesRef = collection(db, "chats", chatId, "messages");

    const snapshot = await onSnapshot(messagesRef, (snapshot) => {
      snapshot.docs.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });
    });
    setMessages([]);
  };

  return (
    <Container fluid className="vh-100 d-flex flex-column">
      <Card className="p-3 bg-primary text-white d-flex flex-row justify-content-between align-items-center">
        <h5>Chat App</h5>
        <Button variant="danger" size="sm" onClick={() => signOut(auth).then(() => navigate("/login"))}>
          Logout
        </Button>
      </Card>

      <Row className="flex-grow-1">
        <Col md={3} className="border-end bg-light p-3 d-flex flex-column">
          <h6 className="text-center">Contacts</h6>
          <ListGroup className="flex-grow-1 overflow-auto">
            {users.map((user) => (
              <ListGroup.Item key={user.id} className="d-flex justify-content-between">
                <span onClick={() => setSelectedUser(user)}>{user.name}</span>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>

        {selectedUser && (
          <Col md={9} className="d-flex flex-column">
            <Card className="p-3 bg-primary text-white d-flex flex-row justify-content-between align-items-center">
              <h5 className="m-0">{selectedUser.name}</h5>
              <Dropdown>
                <Dropdown.Toggle variant="light" size="sm">
                  <FaEllipsisV />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => removeContact(selectedUser.uid)}>
                    <FaUserMinus className="me-2" /> Remove Contact
                  </Dropdown.Item>
                  <Dropdown.Item onClick={deleteChat}>
                    <FaTrash className="me-2" /> Delete Chat
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Card>
          </Col>
        )}
      </Row>
    </Container>
  );
};

export default ChatPage;
