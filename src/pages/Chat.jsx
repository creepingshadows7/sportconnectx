import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import { listAccounts } from '../data/accountDb.js';
import { listMessages, sendMessage } from '../data/messageDb.js';
import { getInitials } from '../utils/name.js';

const formatMessageTime = (value) => {
  if (!value) {
    return '';
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
};

export default function Chat() {
  const { currentAccount, isAuthenticated } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [messagesByContact, setMessagesByContact] = useState({});
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationError, setConversationError] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [draftMessage, setDraftMessage] = useState('');
  const currentAccountId = currentAccount?.id ?? null;
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    const fetchAccounts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listAccounts();
        setAccounts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load members', err);
        setError('We could not load members. Try again in a moment.');
      } finally {
        setLoading(false);
      }
    };

    void fetchAccounts();
  }, [isAuthenticated]);

  const contacts = useMemo(() => {
    const others = accounts.filter((account) => account.id !== currentAccount?.id);
    if (!searchTerm.trim()) {
      return others;
    }
    const needle = searchTerm.trim().toLowerCase();
    return others.filter((account) => {
      const name = account.name?.toLowerCase() ?? '';
      const email = account.email?.toLowerCase() ?? '';
      return name.includes(needle) || email.includes(needle);
    });
  }, [accounts, currentAccount?.id, searchTerm]);

  useEffect(() => {
    if (contacts.length === 0) {
      setSelectedContactId(null);
      return;
    }
    if (!selectedContactId || !contacts.some((contact) => contact.id === selectedContactId)) {
      setSelectedContactId(contacts[0].id);
    }
  }, [contacts, selectedContactId]);

  useEffect(() => {
    setSendError(null);
    if (!selectedContactId) {
      setConversationError(null);
      setConversationLoading(false);
    }
  }, [selectedContactId]);

  useEffect(() => {
    if (!selectedContactId || !currentAccountId) {
      return;
    }

    let cancelled = false;

    const fetchMessages = async () => {
      setConversationLoading(true);
      setConversationError(null);
      try {
        const data = await listMessages(currentAccountId, selectedContactId);
        if (!cancelled) {
          setMessagesByContact((prev) => ({
            ...prev,
            [selectedContactId]: Array.isArray(data) ? data : [],
          }));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load messages', err);
          setConversationError(err?.message ?? 'Could not load messages. Try again later.');
        }
      } finally {
        if (!cancelled) {
          setConversationLoading(false);
        }
      }
    };

    void fetchMessages();

    return () => {
      cancelled = true;
    };
  }, [currentAccountId, selectedContactId]);

  const activeConversation = messagesByContact[selectedContactId] ?? [];
  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId],
  );

  useEffect(() => {
    if (!messagesEndRef.current) {
      return;
    }
    messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
  }, [selectedContactId, activeConversation.length]);

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const trimmed = draftMessage.trim();
    if (!trimmed || !selectedContactId || !currentAccountId) {
      return;
    }

    setSendError(null);
    setSendingMessage(true);
    try {
      const message = await sendMessage({
        senderId: currentAccountId,
        recipientId: selectedContactId,
        text: trimmed,
      });
      setMessagesByContact((prev) => {
        const existing = prev[selectedContactId] ?? [];
        return {
          ...prev,
          [selectedContactId]: [...existing, message],
        };
      });
      setDraftMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
      setSendError(err?.message ?? 'Could not send your message. Try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  if (!isAuthenticated || !currentAccount) {
    return (
      <section className="section chat">
        <div className="section-header">
          <span className="section-eyebrow">Chat</span>
          <h3>Keep the SportConnect X community in sync</h3>
        </div>
        <div className="panel chat-locked">
          <h4>Members only</h4>
          <p>Join SportConnect X to message other sporters, build momentum, and organise activities together.</p>
          <div className="chat-locked-actions">
            <Link to="/login" className="button primary">
              Log in
            </Link>
            <Link to="/signup" className="button ghost">
              Sign up
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section chat">
      <div className="section-header">
        <span className="section-eyebrow">Chat</span>
        <h3>Keep the SportConnect X community in sync</h3>
      </div>

      <div className="chat-layout">
        <aside className="panel chat-sidebar">
          <div className="chat-search">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search members by name"
            />
          </div>
          {loading ? (
            <p className="chat-status">Loading members...</p>
          ) : error ? (
            <p className="chat-status error">{error}</p>
          ) : contacts.length === 0 ? (
            <p className="chat-status">No members found. Adjust your search.</p>
          ) : (
            <ul className="chat-contact-list">
              {contacts.map((contact) => {
                const initials = getInitials(contact.name ?? contact.email ?? '');
                const isActive = contact.id === selectedContactId;
                return (
                  <li key={contact.id}>
                    <button
                      type="button"
                      className={isActive ? 'chat-contact is-active' : 'chat-contact'}
                      onClick={() => setSelectedContactId(contact.id)}
                    >
                      <span className="chat-contact-avatar" aria-hidden="true">
                        {initials || (contact.name || contact.email || '?').charAt(0).toUpperCase()}
                      </span>
                      <span className="chat-contact-body">
                        <span className="chat-contact-name">{contact.name || contact.email}</span>
                        <span className="chat-contact-meta">
                          {contact.role || 'SportConnect X member'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="panel chat-thread">
          {!selectedContact ? (
            <div className="chat-thread-empty">
              <h4>Select a member to start chatting</h4>
              <p>Search for a teammate or mentor to plan your next activity together.</p>
            </div>
          ) : (
            <>
              <header className="chat-thread-header">
                <div className="chat-thread-recipient">
                  <span className="chat-contact-avatar" aria-hidden="true">
                    {getInitials(selectedContact.name ?? selectedContact.email ?? '') ||
                      (selectedContact.name || selectedContact.email || '?').charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <h4>{selectedContact.name || selectedContact.email}</h4>
                    <p>{selectedContact.role || 'Community member'}</p>
                  </div>
                </div>
              </header>

              <div className="chat-messages" ref={messagesEndRef}>
                {conversationError ? (
                  <p className="chat-status error">{conversationError}</p>
                ) : activeConversation.length === 0 ? (
                  conversationLoading ? (
                    <p className="chat-status">Loading messages...</p>
                  ) : (
                    <p className="chat-status">No messages yet. Say hello!</p>
                  )
                ) : (
                  <>
                    {activeConversation.map((message) => {
                      const isMine = currentAccountId != null && message.senderId === currentAccountId;
                      return (
                        <div
                          key={message.id}
                          className={isMine ? 'chat-message is-own' : 'chat-message'}
                        >
                          <div className="chat-message-bubble">
                            <p>{message.text}</p>
                            <span className="chat-message-time">
                              {formatMessageTime(message.createdAt ?? message.timestamp)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {conversationLoading && (
                      <p className="chat-status">Refreshing conversation...</p>
                    )}
                  </>
                )}
              </div>

              <form className="chat-composer" onSubmit={handleSendMessage}>
                <label className="visually-hidden" htmlFor="chat-message-input">
                  Message
                </label>
                <div className="chat-composer-row">
                  <textarea
                    id="chat-message-input"
                    value={draftMessage}
                    onChange={(event) => {
                      setDraftMessage(event.target.value);
                      if (sendError) {
                        setSendError(null);
                      }
                    }}
                    placeholder={`Message ${selectedContact.name || selectedContact.email}`}
                    rows={2}
                    disabled={sendingMessage}
                  />
                  <button
                    type="submit"
                    className="button primary"
                    disabled={sendingMessage || !draftMessage.trim()}
                  >
                    {sendingMessage ? 'Sending...' : 'Send'}
                  </button>
                </div>
                {sendError && <p className="chat-status error chat-send-error">{sendError}</p>}
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
