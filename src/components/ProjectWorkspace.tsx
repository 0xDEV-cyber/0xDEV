import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Link2,
  MessageSquare,
  Plus,
  Printer,
  Receipt,
  Send,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COMPANY_CONTACT } from '../data/siteData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Logo } from './Logo';
import type { ProjectMilestoneRecord, TrackedInquiry } from './ProjectTimeline';

interface ProjectMessage {
  messageId: string;
  senderRole: 'client' | 'admin';
  senderName: string;
  body: string;
  createdAtMs: number;
  timeLabel: string;
}

interface ProjectDeliverable {
  deliverableId: string;
  title: string;
  category: 'figma' | 'staging' | 'repository' | 'production' | 'document';
  url: string;
  notes: string;
}

interface ProjectInvoice {
  invoiceId: string;
  title: string;
  phase: string;
  amountUsd: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  paymentMethod: string;
  notes: string;
}

interface ProjectWorkspaceProps {
  inquiry: TrackedInquiry | null;
  milestones?: ProjectMilestoneRecord[];
}

function formatChatTime(ts: unknown): { ms: number; label: string } {
  if (ts instanceof Timestamp) {
    const d = ts.toDate();
    return {
      ms: d.getTime(),
      label: new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(d),
    };
  }
  return { ms: Date.now(), label: 'Just now' };
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ inquiry, milestones = [] }) => {
  const { user } = useAuth();
  const isPrimaryAdmin =
    Boolean(user?.emailVerified) && user?.email?.toLowerCase() === 'arigyewisdom7@gmail.com';

  const [activeTab, setActiveTab] = useState<'chat' | 'deliverables' | 'invoices'>('chat');
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [deliverables, setDeliverables] = useState<ProjectDeliverable[]>([]);
  const [invoices, setInvoices] = useState<ProjectInvoice[]>([]);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  // Deliverable form (admin)
  const [delTitle, setDelTitle] = useState('');
  const [delCategory, setDelCategory] = useState<ProjectDeliverable['category']>('staging');
  const [delUrl, setDelUrl] = useState('');
  const [delNotes, setDelNotes] = useState('');
  const [savingDel, setSavingDel] = useState(false);

  // Invoice form (admin)
  const [invTitle, setInvTitle] = useState('');
  const [invPhase, setInvPhase] = useState('Kickoff Deposit (40%)');
  const [invAmount, setInvAmount] = useState('2500');
  const [invDue, setInvDue] = useState('');
  const [invNotes, setInvNotes] = useState('');
  const [savingInv, setSavingInv] = useState(false);
  const [showPrintSheet, setShowPrintSheet] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !inquiry) {
      setMessages([]);
      setDeliverables([]);
      setInvoices([]);
      return;
    }

    const msgRef = collection(db, 'inquiries', inquiry.inquiryId, 'messages');
    const msgQ = isPrimaryAdmin ? msgRef : query(msgRef, where('authorId', '==', user.uid));
    const unsubMsg = onSnapshot(
      msgQ,
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data();
            const t = formatChatTime(data.createdAt);
            return {
              messageId: String(data.messageId || d.id),
              senderRole: (data.senderRole === 'admin' ? 'admin' : 'client') as 'client' | 'admin',
              senderName: String(data.senderName || 'Team'),
              body: String(data.body || ''),
              createdAtMs: t.ms,
              timeLabel: t.label,
            };
          })
          .sort((a, b) => a.createdAtMs - b.createdAtMs);
        setMessages(list);
      },
      (err) =>
        handleFirestoreError(err, OperationType.LIST, `inquiries/${inquiry.inquiryId}/messages`)
    );

    const delRef = collection(db, 'inquiries', inquiry.inquiryId, 'deliverables');
    const delQ = isPrimaryAdmin ? delRef : query(delRef, where('authorId', '==', user.uid));
    const unsubDel = onSnapshot(
      delQ,
      (snap) => {
        setDeliverables(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              deliverableId: String(data.deliverableId || d.id),
              title: String(data.title || ''),
              category: (data.category || 'staging') as ProjectDeliverable['category'],
              url: String(data.url || ''),
              notes: String(data.notes || ''),
            };
          })
        );
      },
      (err) =>
        handleFirestoreError(err, OperationType.LIST, `inquiries/${inquiry.inquiryId}/deliverables`)
    );

    const invRef = collection(db, 'inquiries', inquiry.inquiryId, 'invoices');
    const invQ = isPrimaryAdmin ? invRef : query(invRef, where('authorId', '==', user.uid));
    const unsubInv = onSnapshot(
      invQ,
      (snap) => {
        setInvoices(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              invoiceId: String(data.invoiceId || d.id),
              title: String(data.title || ''),
              phase: String(data.phase || ''),
              amountUsd: Math.max(0, Number(data.amountUsd) || 0),
              dueDate: String(data.dueDate || ''),
              status: (data.status || 'pending') as ProjectInvoice['status'],
              paymentMethod: String(data.paymentMethod || ''),
              notes: String(data.notes || ''),
            };
          })
        );
      },
      (err) =>
        handleFirestoreError(err, OperationType.LIST, `inquiries/${inquiry.inquiryId}/invoices`)
    );

    return () => {
      unsubMsg();
      unsubDel();
      unsubInv();
    };
  }, [user, inquiry, isPrimaryAdmin]);

  const invoiceTotals = useMemo(() => {
    const total = invoices.reduce((acc, i) => acc + i.amountUsd, 0);
    const paid = invoices
      .filter((i) => i.status === 'paid')
      .reduce((acc, i) => acc + i.amountUsd, 0);
    return { total, paid, balance: Math.max(0, total - paid) };
  }, [invoices]);

  if (!user || !inquiry) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpError(null);
    const body = chatInput.trim();
    if (!body) return;
    if (!user.emailVerified) {
      setOpError('Please verify your email address before sending project messages.');
      return;
    }

    const messageId = `MSG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    setSendingChat(true);
    try {
      await setDoc(doc(db, 'inquiries', inquiry.inquiryId, 'messages', messageId), {
        messageId,
        inquiryId: inquiry.inquiryId,
        authorId: inquiry.authorId,
        senderId: user.uid,
        senderRole: isPrimaryAdmin ? 'admin' : 'client',
        senderName: (user.displayName || user.email || 'Member').slice(0, 100),
        body: body.slice(0, 2000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setChatInput('');

      // Notify client automatically when admin replies
      if (isPrimaryAdmin && inquiry.authorId !== user.uid) {
        const notifId = `NTF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const notifBody = body.length >= 2 ? body.slice(0, 500) : `Reply: ${body}`;
        try {
          await setDoc(doc(db, 'notifications', notifId), {
            notificationId: notifId,
            recipientId: inquiry.authorId,
            senderEmail: user.email || COMPANY_CONTACT.email,
            type: 'admin_message',
            title: `New message on ${inquiry.service}`.slice(0, 140),
            body: notifBody,
            inquiryId: inquiry.inquiryId,
            isRead: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (notifErr) {
          console.warn('Secondary notification delivery failed:', notifErr);
        }
      }
    } catch (err) {
      setOpError('Unable to send message right now.');
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `inquiries/${inquiry.inquiryId}/messages/${messageId}`
      );
    } finally {
      setSendingChat(false);
    }
  };

  const handleAddDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPrimaryAdmin) return;
    setOpError(null);

    const cleanTitle = delTitle.trim();
    const cleanUrl = delUrl.trim();
    let isValidHttpsUrl = false;
    try {
      const parsed = new URL(cleanUrl);
      isValidHttpsUrl = parsed.protocol === 'https:' && parsed.hostname.includes('.');
    } catch {
      isValidHttpsUrl = false;
    }

    if (cleanTitle.length < 2 || !isValidHttpsUrl) {
      setOpError('Deliverable title (2+ chars) and a valid https:// URL are required.');
      return;
    }

    const deliverableId = `DEL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    setSavingDel(true);
    try {
      await setDoc(doc(db, 'inquiries', inquiry.inquiryId, 'deliverables', deliverableId), {
        deliverableId,
        inquiryId: inquiry.inquiryId,
        authorId: inquiry.authorId,
        title: delTitle.trim().slice(0, 120),
        category: delCategory,
        url: delUrl.trim().slice(0, 500),
        notes: delNotes.trim().slice(0, 300),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setDelTitle('');
      setDelUrl('');
      setDelNotes('');
    } catch (err) {
      setOpError('Unable to save deliverable link.');
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `inquiries/${inquiry.inquiryId}/deliverables/${deliverableId}`
      );
    } finally {
      setSavingDel(false);
    }
  };

  const handleDeleteDeliverable = async (deliverableId: string) => {
    if (!isPrimaryAdmin) return;
    try {
      await deleteDoc(doc(db, 'inquiries', inquiry.inquiryId, 'deliverables', deliverableId));
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `inquiries/${inquiry.inquiryId}/deliverables/${deliverableId}`
      );
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPrimaryAdmin) return;
    setOpError(null);

    const parsedAmount = Math.round(Number(invAmount));
    if (
      invTitle.trim().length < 2 ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount < 1 ||
      parsedAmount > 1000000
    ) {
      setOpError('Invoice title (2+ chars) and a USD amount between 1 and 1,000,000 are required.');
      return;
    }

    const invoiceId = `INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    setSavingInv(true);
    try {
      await setDoc(doc(db, 'inquiries', inquiry.inquiryId, 'invoices', invoiceId), {
        invoiceId,
        inquiryId: inquiry.inquiryId,
        authorId: inquiry.authorId,
        title: invTitle.trim().slice(0, 120),
        phase: invPhase.trim().slice(0, 60) || 'Milestone',
        amountUsd: parsedAmount,
        dueDate: invDue.trim().slice(0, 40),
        status: 'pending',
        paymentMethod: 'Bank Transfer / Card / MoMo',
        notes: invNotes.trim().slice(0, 400),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setInvTitle('');
      setInvDue('');
      setInvNotes('');
    } catch (err) {
      setOpError('Unable to create invoice.');
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `inquiries/${inquiry.inquiryId}/invoices/${invoiceId}`
      );
    } finally {
      setSavingInv(false);
    }
  };

  const handleSetInvoiceStatus = async (
    invoiceId: string,
    status: ProjectInvoice['status']
  ) => {
    if (!isPrimaryAdmin) return;
    try {
      await updateDoc(doc(db, 'inquiries', inquiry.inquiryId, 'invoices', invoiceId), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `inquiries/${inquiry.inquiryId}/invoices/${invoiceId}`
      );
    }
  };

  const triggerPrintProposal = () => {
    setShowPrintSheet(true);
    window.setTimeout(() => {
      window.print();
    }, 180);
  };

  return (
    <section
      aria-labelledby="workspace-heading"
      className="relative mt-10 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-8 shadow-[0_18px_45px_rgba(26,20,100,0.05)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)] print:border-0 print:bg-white print:p-0 print:shadow-none"
    >
      <div className="print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[#E5E7F0] dark:border-[#242C54] pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
              Active Project Workspace · {inquiry.inquiryId}
            </p>
            <h2
              id="workspace-heading"
              className="mt-1 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]"
            >
              Chat, Deliverables &amp; Invoices
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-1"
              role="tablist"
              aria-label="Project workspace sections"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'chat'}
                onClick={() => setActiveTab('chat')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-[#1A1464] dark:bg-[#2E368F] text-white'
                    : 'text-[#4A4F63] dark:text-[#C2C9E0] hover:text-[#1A1464] dark:hover:text-white'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Team Chat ({messages.length})</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'deliverables'}
                onClick={() => setActiveTab('deliverables')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
                  activeTab === 'deliverables'
                    ? 'bg-[#1A1464] dark:bg-[#2E368F] text-white'
                    : 'text-[#4A4F63] dark:text-[#C2C9E0] hover:text-[#1A1464] dark:hover:text-white'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Deliverables ({deliverables.length})</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'invoices'}
                onClick={() => setActiveTab('invoices')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
                  activeTab === 'invoices'
                    ? 'bg-[#1A1464] dark:bg-[#2E368F] text-white'
                    : 'text-[#4A4F63] dark:text-[#C2C9E0] hover:text-[#1A1464] dark:hover:text-white'
                }`}
              >
                <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Invoices ({invoices.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={triggerPrintProposal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1A1464] dark:border-[#3A437A] bg-white dark:bg-[#101530] px-3.5 py-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:bg-[#1A1464] dark:hover:bg-[#2E368F] hover:text-white transition-colors"
            >
              <Printer className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
              <span>Print Proposal / PDF</span>
            </button>
          </div>
        </div>

        {opError && (
          <div role="alert" className="mt-4 rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/5 dark:bg-[#EE1119]/10 p-3 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC]">
            {opError}
          </div>
        )}

        {/* TAB 1: Direct Client-Admin Chat */}
        {activeTab === 'chat' && (
          <div className="mt-6 space-y-4">
            <div className="max-h-80 overflow-y-auto space-y-3 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/70 dark:bg-[#101530] p-4">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-xs text-[#6B7188] dark:text-[#8E97B8]">
                  No project messages yet. Send a note below to collaborate directly with {COMPANY_CONTACT.leadName} and the 0xDEV team.
                </p>
              ) : (
                messages.map((msg) => {
                  const isMine =
                    (isPrimaryAdmin && msg.senderRole === 'admin') ||
                    (!isPrimaryAdmin && msg.senderRole === 'client');
                  return (
                    <div
                      key={msg.messageId}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm ${
                          msg.senderRole === 'admin'
                            ? 'bg-[#1A1464] dark:bg-[#2E368F] text-white'
                            : 'bg-white dark:bg-[#182044] border border-[#E5E7F0] dark:border-[#2B3466] text-[#1A1464] dark:text-[#F4F6FC]'
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2 text-[10px] opacity-75">
                          <span className="font-bold">
                            {msg.senderRole === 'admin' ? `${msg.senderName} · 0xDEV Team` : msg.senderName}
                          </span>
                          <span>·</span>
                          <span>{msg.timeLabel}</span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="project-chat-input" className="sr-only">
                Write a project message
              </label>
              <input
                id="project-chat-input"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Write a message, question, or sprint update..."
                className="flex-1 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] px-4 py-3 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 focus:border-[#1A1464] dark:focus:border-[#7C8CFF] focus:bg-white dark:focus:bg-[#182044]"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatInput.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-5 py-3 text-xs font-bold text-white hover:bg-[#D00D14] disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{sendingChat ? 'Sending...' : 'Send Message'}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: Shared Deliverables & Links */}
        {activeTab === 'deliverables' && (
          <div className="mt-6 space-y-5">
            {isPrimaryAdmin && (
              <form
                onSubmit={handleAddDeliverable}
                className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-4 space-y-3"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]">
                  Share Deliverable Link (Figma, Staging, Repo, Docs)
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    placeholder="Title (e.g. Figma System v1)"
                    value={delTitle}
                    onChange={(e) => setDelTitle(e.target.value)}
                    className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                  />
                  <select
                    value={delCategory}
                    onChange={(e) => setDelCategory(e.target.value as ProjectDeliverable['category'])}
                    className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs font-semibold text-[#1A1464] dark:text-white"
                  >
                    <option value="figma">Figma Prototype</option>
                    <option value="staging">Staging Preview URL</option>
                    <option value="repository">GitHub Repository</option>
                    <option value="production">Production App</option>
                    <option value="document">Architecture / Spec Doc</option>
                  </select>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={delUrl}
                    onChange={(e) => setDelUrl(e.target.value)}
                    className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    placeholder="Optional notes for the client..."
                    value={delNotes}
                    onChange={(e) => setDelNotes(e.target.value)}
                    className="flex-1 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={savingDel}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-4 py-2 text-xs font-bold text-white hover:bg-[#120D4A] dark:hover:bg-[#3A43A8]"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                    <span>{savingDel ? 'Saving...' : 'Add Link'}</span>
                  </button>
                </div>
              </form>
            )}

            {deliverables.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D3D7E6] dark:border-[#2E3766] bg-[#F6F7FB]/50 dark:bg-[#101530] p-8 text-center">
                <FileText className="mx-auto h-7 w-7 text-[#1A1464]/45 dark:text-[#7C8CFF]/50" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC]">
                  No shared deliverable links yet
                </p>
                <p className="mt-1 text-xs text-[#6B7188] dark:text-[#8E97B8]">
                  Figma prototypes, staging preview URLs, and GitHub repositories shared by your squad will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {deliverables.map((item) => (
                  <div
                    key={item.deliverableId}
                    className="flex items-start justify-between gap-3 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] p-4"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#EE1119]">
                        {item.category}
                      </span>
                      <p className="mt-0.5 font-display text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC] truncate">
                        {item.title}
                      </p>
                      {item.notes && (
                        <p className="mt-1 text-xs text-[#4A4F63] dark:text-[#C2C9E0]">{item.notes}</p>
                      )}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#1A1464] dark:text-[#9FA8FF] hover:text-[#EE1119]"
                      >
                        <span>Open Resource</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </div>
                    {isPrimaryAdmin && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteDeliverable(item.deliverableId)}
                        aria-label={`Remove ${item.title}`}
                        className="rounded-lg p-1.5 text-[#6B7188] dark:text-[#8E97B8] hover:text-[#EE1119]"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Milestone Invoices & Payment Breakdown */}
        {activeTab === 'invoices' && (
          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                  Total Invoiced
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
                  ${invoiceTotals.total.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                  Paid to Date
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold text-[#16A34A] tabular-nums">
                  ${invoiceTotals.paid.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                  Remaining Balance
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold text-[#EE1119] tabular-nums">
                  ${invoiceTotals.balance.toLocaleString()}
                </p>
              </div>
            </div>

            {isPrimaryAdmin && (
              <form
                onSubmit={handleCreateInvoice}
                className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-4 space-y-3"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]">
                  Issue Milestone Invoice
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <input
                    type="text"
                    placeholder="Invoice Title"
                    value={invTitle}
                    onChange={(e) => setInvTitle(e.target.value)}
                    className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Phase (e.g. Kickoff 40%)"
                    value={invPhase}
                    onChange={(e) => setInvPhase(e.target.value)}
                    className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="USD Amount"
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white tabular-nums"
                  />
                  <input
                    type="text"
                    placeholder="Due date (optional)"
                    value={invDue}
                    onChange={(e) => setInvDue(e.target.value)}
                    className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    placeholder="Payment instructions / MoMo / Bank ref..."
                    value={invNotes}
                    onChange={(e) => setInvNotes(e.target.value)}
                    className="flex-1 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs text-[#1A1464] dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={savingInv}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#EE1119] px-4 py-2 text-xs font-bold text-white hover:bg-[#D00D14]"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{savingInv ? 'Issuing...' : 'Create Invoice'}</span>
                  </button>
                </div>
              </form>
            )}

            {invoices.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#6B7188] dark:text-[#8E97B8]">
                No milestone invoices issued yet for this inquiry. Use Print Proposal / PDF above to export your current project brief &amp; timeline summary.
              </p>
            ) : (
              <div className="space-y-2.5">
                {invoices.map((inv) => (
                  <div
                    key={inv.invoiceId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] p-4 text-xs"
                  >
                    <div>
                      <p className="font-mono text-[10px] text-[#6B7188] dark:text-[#8E97B8]">
                        {inv.invoiceId} · {inv.phase}
                        {inv.dueDate ? ` · Due ${inv.dueDate}` : ''}
                      </p>
                      <p className="mt-0.5 font-display text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                        {inv.title}
                      </p>
                      {inv.notes && <p className="mt-0.5 text-[#4A4F63] dark:text-[#C2C9E0]">{inv.notes}</p>}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-display text-base font-extrabold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
                        ${inv.amountUsd.toLocaleString()}
                      </span>
                      <span
                        className={`font-bold uppercase ${
                          inv.status === 'paid'
                            ? 'text-[#16A34A]'
                            : inv.status === 'overdue'
                              ? 'text-[#EE1119]'
                              : 'text-[#1A1464] dark:text-[#9FA8FF]'
                        }`}
                      >
                        {inv.status}
                      </span>
                      {isPrimaryAdmin && inv.status !== 'paid' && (
                        <button
                          type="button"
                          onClick={() => void handleSetInvoiceStatus(inv.invoiceId, 'paid')}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#16A34A] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#15803D]"
                        >
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          <span>Mark Paid</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Printable A4 Proposal / Invoice Letterhead (rendered for print & preview) */}
      {showPrintSheet && (
        <div className="mt-8 rounded-2xl border border-[#1A1464]/30 bg-white p-8 print:mt-0 print:border-0 print:p-0">
          <div className="flex items-start justify-between border-b-2 border-[#1A1464] pb-5">
            <div>
              <Logo variant="light" />
              <p className="mt-2 text-xs text-[#4A4F63]">
                {COMPANY_CONTACT.location} · {COMPANY_CONTACT.phoneDisplay} · {COMPANY_CONTACT.email}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-[#EE1119]">
                Project Statement &amp; Proposal
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-[#1A1464]">{inquiry.inquiryId}</p>
              <p className="text-xs text-[#6B7188]">Issued: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6 text-xs">
            <div>
              <p className="font-bold uppercase text-[#6B7188]">Prepared For</p>
              <p className="mt-1 font-display text-sm font-bold text-[#1A1464]">{inquiry.name}</p>
              {inquiry.company && <p className="text-[#4A4F63]">{inquiry.company}</p>}
              <p className="text-[#4A4F63]">{inquiry.email}</p>
            </div>
            <div className="text-right">
              <p className="font-bold uppercase text-[#6B7188]">Engagement Scope</p>
              <p className="mt-1 font-display text-sm font-bold text-[#1A1464]">{inquiry.service}</p>
              <p className="text-[#4A4F63]">Estimated Budget: {inquiry.budget}</p>
            </div>
          </div>

          {milestones.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] mb-2">
                Delivery Milestones
              </p>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7F0] text-[#6B7188]">
                    <th className="py-2">Phase</th>
                    <th className="py-2">Deliverable</th>
                    <th className="py-2 text-right">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7F0]">
                  {milestones.map((m) => (
                    <tr key={m.milestoneId}>
                      <td className="py-2 font-bold text-[#1A1464]">{m.phase}</td>
                      <td className="py-2 text-[#4A4F63]">{m.title}</td>
                      <td className="py-2 text-right font-mono font-bold tabular-nums">{m.progress}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {invoices.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] mb-2">
                Milestone Invoices
              </p>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7F0] text-[#6B7188]">
                    <th className="py-2">Invoice</th>
                    <th className="py-2">Phase</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7F0]">
                  {invoices.map((i) => (
                    <tr key={i.invoiceId}>
                      <td className="py-2 font-bold text-[#1A1464]">{i.title}</td>
                      <td className="py-2 text-[#4A4F63]">{i.phase}</td>
                      <td className="py-2 uppercase font-bold">{i.status}</td>
                      <td className="py-2 text-right font-mono font-bold tabular-nums">
                        ${i.amountUsd.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 print:hidden">
            <button
              type="button"
              onClick={() => setShowPrintSheet(false)}
              className="rounded-lg border border-[#E5E7F0] px-4 py-2 text-xs font-bold text-[#4A4F63]"
            >
              Hide Print View
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-[#1A1464] px-4 py-2 text-xs font-bold text-white"
            >
              Print / Save as PDF
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
