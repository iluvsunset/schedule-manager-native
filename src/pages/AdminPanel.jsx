import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  collection, doc, getDoc, setDoc, addDoc, getDocs, 
  updateDoc, deleteDoc, onSnapshot, query, where, arrayRemove, orderBy, limit, Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase } from '../platform';
import { showMessage, formatTime, formatDate } from '../utils/helpers';
import Topbar from '../components/layout/Topbar';
import { ConfirmModal } from '../components/dashboard/Modals';
import { 
  Users, BookOpen, Settings, ArrowLeft, Search, LogOut, UserX, UserPlus, 
  PieChart, Edit, Trash2, PlusSquare, Monitor, 
  Wrench, Link as LinkIcon, ShieldAlert, Megaphone, ScrollText, CalendarX2,
  Server, Shield, Mail, AlertTriangle, Database, FastForward
} from 'lucide-react';
import { motion } from 'framer-motion';
import WebGLBackground from '../components/WebGLBackground';

export default function AdminPanel() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');

  // Core data states
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('student');
  const [newClassName, setNewClassName] = useState('');

  // Class Editor Modal states
  const [editClass, setEditClass] = useState(null);
  const [allUsersForClass, setAllUsersForClass] = useState([]);
  const [classParticipants, setClassParticipants] = useState([]);

  // IT Config states (system_settings/config)
  const [lockdownMode, setLockdownMode] = useState(false);
  const [lockdownMessage, setLockdownMessage] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [senderEmail, setSenderEmail] = useState('');

  // Modals visibility states
  const [showPermsModal, setShowPermsModal] = useState(false);
  const [permsModalExiting, setPermsModalExiting] = useState(false);
  const [permsBtnState, setPermsBtnState] = useState('idle'); // idle, loading, success, error
  const [showSMTPModal, setShowSMTPModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rulesModalExiting, setRulesModalExiting] = useState(false);
  const [rulesBtnState, setRulesBtnState] = useState('idle');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);

  // Modal parameter states
  const [permissionsMatrix, setPermissionsMatrix] = useState({});
  const [smtpConfig, setSmtpConfig] = useState({ enabled: false, host: '', port: 587, user: '', pass: '' });
  const [mailRules, setMailRules] = useState({});
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [testTemplate, setTestTemplate] = useState('schedule_created');
  const [testRecipient, setTestRecipient] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  // System Logs states
  const [systemLogs, setSystemLogs] = useState([]);
  const [logFilter, setLogFilter] = useState('all');
  const [logsLoading, setLogsLoading] = useState(true);

  // GCal Reset Preview state
  const [gcalResetPreview, setGcalResetPreview] = useState(null); // { schedules: [], classCount: 0 }

  const writeSystemLog = async (type, source, message, details = {}) => {
    try {
      await addDoc(collection(db, 'system_logs'), {
        type,
        source,
        uid: currentUser?.uid || 'system',
        userEmail: currentUser?.email || 'system',
        message,
        details,
        timestamp: Timestamp.now()
      });
    } catch (e) {
      console.warn("Failed to write system log:", e);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredClasses = classes.filter(c => 
    c.className?.toLowerCase().includes(classSearch.toLowerCase())
  );

  // Redirect if not IT/Coordinator/Teacher
  useEffect(() => {
    if (userRole && !['it', 'academic_coordinator', 'senior_teacher'].includes(userRole)) {
      navigate('/');
    }
  }, [userRole, navigate]);

  // Fetch Users, Classes and IT Settings
  useEffect(() => {
    if (!currentUser) return;

    // Users listener
    const unsubUsers = onSnapshot(collection(db, 'allowed_users'), (snap) => {
      const uList = [];
      snap.forEach(d => uList.push({ id: d.id, ...d.data() }));
      setUsers(uList);
    }, (error) => {
      console.warn("Allowed users listener failed:", error.message);
    });

    // Classes listener
    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      const cList = [];
      snap.forEach(d => cList.push({ id: d.id, ...d.data() }));
      setClasses(cList);
      setLoading(false);
    }, (error) => {
      console.warn("Classes listener failed:", error.message);
      setLoading(false);
    });

    // IT Settings listener
    const unsubConfig = onSnapshot(doc(db, 'system_settings', 'config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLockdownMode(!!data.maintenanceMode);
        setLockdownMessage(data.lockdownMessage || '');
        setEmailEnabled(data.emailEnabled !== false);
      }
    }, (error) => {
      console.warn("Config listener failed:", error.message);
    });

    // Sender Config loader
    getDoc(doc(db, 'system_settings', 'email_config')).then(snap => {
      if (snap.exists() && snap.data().sender_email) {
        setSenderEmail(snap.data().sender_email);
      }
    });

    // System Logs listener (IT only)
    let unsubLogs = () => {};
    if (userRole === 'it') {
      const logsQuery = query(
        collection(db, 'system_logs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      unsubLogs = onSnapshot(logsQuery, (snap) => {
        const logsList = [];
        snap.forEach(d => logsList.push({ id: d.id, ...d.data() }));
        setSystemLogs(logsList);
        setLogsLoading(false);
      }, (error) => {
        console.warn('System logs listener failed:', error.message);
        setLogsLoading(false);
      });
    }

    return () => {
      unsubUsers();
      unsubClasses();
      unsubConfig();
      unsubLogs();
    };
  }, [currentUser, userRole]);

  if (!currentUser || !userRole) return null;

  // Invite User Submit
  const handleInviteUser = async (e) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    try {
      await setDoc(doc(db, 'allowed_users', email), {
        email,
        role: inviteRole,
        addedAt: Timestamp.now()
      });
      await writeSystemLog('admin_action', 'admin_panel', `Added user ${email} with role ${inviteRole}`, { email, role: inviteRole });
      showMessage(`Added ${email} successfully!`, 'success');
      setInviteEmail('');
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  // Kick User Session
  const handleKickUser = async (email) => {
    setConfirmAction({
      message: `Force logout (kick) ${email}?`,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'allowed_users', email), {
            forceLogoutAt: Timestamp.now()
          });
          await writeSystemLog('admin_action', 'admin_panel', `Force-logout session for ${email}`, { target: email });
          showMessage(`Kicked session for ${email}`, 'success');
        } catch (err) {
          showMessage(err.message, 'error');
        }
      }
    });
  };

  // Revoke User Access (Ban)
  const handleRevokeUser = async (email) => {
    setConfirmAction({
      message: `Revoke all access for ${email}?`,
      onConfirm: async () => {
        try {
          showMessage('Removing user from classes & syncing schedules...', 'success');
          // 1. Remove from all classrooms
          const q = query(collection(db, 'classes'), where('participants', 'array-contains', email));
          const classSnap = await getDocs(q);
          const batchUpdates = [];
          const affectedClassIds = [];
          classSnap.forEach(d => {
            affectedClassIds.push(d.id);
            batchUpdates.push(updateDoc(doc(db, 'classes', d.id), {
              participants: arrayRemove(email)
            }));
          });
          await Promise.all(batchUpdates);

          // 2. Cascade: Remove user from participants on all schedules linked to affected classes
          if (affectedClassIds.length > 0) {
            const schedSnap = await getDocs(collection(db, 'schedules'));
            const schedUpdates = [];
            schedSnap.forEach(sDoc => {
              const s = sDoc.data();
              if (affectedClassIds.includes(s.classId) && s.participants?.includes(email)) {
                schedUpdates.push(updateDoc(doc(db, 'schedules', sDoc.id), {
                  participants: arrayRemove(email)
                }));
              }
            });
            await Promise.all(schedUpdates);
          }

          // 3. Delete user doc
          await deleteDoc(doc(db, 'allowed_users', email));
          await writeSystemLog('admin_action', 'admin_panel', `Revoked access for ${email}, removed from ${batchUpdates.length} classrooms`, { target: email, classes_affected: batchUpdates.length });
          showMessage(`Revoked access for ${email} & removed from ${batchUpdates.length} classrooms + synced schedules.`, 'success');
        } catch (err) {
          showMessage(err.message, 'error');
        }
      }
    });
  };

  // Create Classroom Submit
  const handleCreateClass = async (e) => {
    e.preventDefault();
    const name = newClassName.trim();
    if (!name) return;
    try {
      await addDoc(collection(db, 'classes'), {
        className: name,
        participants: [],
        createdAt: Timestamp.now()
      });
      await writeSystemLog('admin_action', 'admin_panel', `Created classroom '${name}'`, { class_name: name });
      showMessage(`Class "${name}" created!`, 'success');
      setNewClassName('');
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  // Delete Classroom
  const handleDeleteClass = async (id, className) => {
    setConfirmAction({
      message: `Delete classroom "${className}"?`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'classes', id));
          await writeSystemLog('admin_action', 'admin_panel', `Deleted classroom '${className}'`, { class_id: id, class_name: className });
          showMessage('Classroom deleted', 'success');
        } catch (err) {
          showMessage(err.message, 'error');
        }
      }
    });
  };

  // Open Classroom Enrollment Editor
  const handleOpenEditClass = async (clsObj) => {
    setEditClass(clsObj);
    setClassParticipants(clsObj.participants || []);
    try {
      const snap = await getDocs(collection(db, 'allowed_users'));
      const list = [];
      snap.forEach(d => {
        const u = d.data();
        if (u.role === 'student' || u.role === 'teacher') list.push(u);
      });
      setAllUsersForClass(list);
    } catch (e) {
      console.error(e);
    }
  };

  // Save Enrollment Changes (with auto-sync to schedules)
  const handleSaveEnrollment = async () => {
    if (!editClass) return;
    try {
      // 1. Update the class document
      await updateDoc(doc(db, 'classes', editClass.id), {
        participants: classParticipants
      });

      // 2. Auto-sync: Cascade participants to ALL schedules linked to this class
      const schedSnap = await getDocs(query(collection(db, 'schedules'), where('classId', '==', editClass.id)));
      const syncUpdates = [];
      schedSnap.forEach(sDoc => {
        syncUpdates.push(updateDoc(doc(db, 'schedules', sDoc.id), {
          participants: classParticipants,
          className: editClass.className
        }));
      });
      if (syncUpdates.length > 0) {
        await Promise.all(syncUpdates);
        console.log(`Auto-synced ${syncUpdates.length} schedules with updated enrollment.`);
      }
      
      // 3. Send invite emails to newly added students
      const addedStudents = classParticipants.filter(email => !editClass.participants?.includes(email));

      if (addedStudents.length > 0 && emailEnabled) {
        showMessage(`Enrollment saved & ${syncUpdates.length} schedules synced! Sending invitations...`, 'success');
        const idToken = await auth.currentUser.getIdToken();
        const apiBase = getApiBase();
        for (const email of addedStudents) {
          try {
            await fetch(`${apiBase}/api/email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
              body: JSON.stringify({
                to_email: email,
                to_name: email.split('@')[0],
                subject: `You have been enrolled in ${editClass.className}`,
                email_type: 'class_invite',
                template_data: { class_name: editClass.className, link: window.location.origin }
              })
            });
          } catch (e) {
            console.error("Invite email failed for:", email, e);
          }
        }
      } else {
        showMessage(`Enrollment updated & ${syncUpdates.length} schedules synced!`, 'success');
      }

      await writeSystemLog('admin_action', 'admin_panel', `Updated enrollment for '${editClass.className}': ${classParticipants.length} students, ${addedStudents.length} added, synced ${syncUpdates.length} schedules`, { 
        class_id: editClass.id, 
        class_name: editClass.className,
        total_students: classParticipants.length,
        added_students: addedStudents.length,
        synced_schedules: syncUpdates.length
      });

      setEditClass(null);
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  // Link Classroom schedules based on students intersection
  const handleLinkClassSchedules = async () => {
    if (!editClass) return;
    
    setConfirmAction({
      message: `Scan schedules for students in "${editClass.className}" and link them to this classroom context?`,
      onConfirm: async () => {
        try {
          showMessage('Scanning schedules...', 'success');
          const snap = await getDocs(collection(db, 'schedules'));
          const updates = [];
          let count = 0;

          snap.forEach(docSnap => {
            const s = docSnap.data();
            const sParts = s.participants || [];
            const intersection = sParts.filter(p => classParticipants.includes(p));

            if (intersection.length > 0) {
              updates.push(updateDoc(doc(db, 'schedules', docSnap.id), {
                classId: editClass.id,
                participants: classParticipants,
                className: editClass.className
              }));
              count++;
            }
          });

          if (count === 0) {
            showMessage('No matching schedules found containing enrolled students.', 'error');
            return;
          }

          setConfirmAction({
            message: `Found ${count} schedules. Move them into classroom context?`,
            onConfirm: async () => {
              try {
                await Promise.all(updates);
                showMessage(`Successfully linked ${count} class schedules!`, 'success');
              } catch (e) {
                showMessage(e.message, 'error');
              }
            }
          });
        } catch (e) {
          showMessage(e.message, 'error');
        }
      }
    });
  };

  // Toggle Enrollment Checkbox
  const handleToggleClassParticipant = (email) => {
    setClassParticipants(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  // ── IT CONTROLS ACTIONS ───────────────────────────────────────
  const handleLockdownChange = async (e) => {
    const checked = e.target.checked;
    setLockdownMode(checked);
    try {
      await setDoc(doc(db, 'system_settings', 'config'), {
        maintenanceMode: checked,
        lockdownMessage
      }, { merge: true });
      await writeSystemLog('admin_action', 'admin_panel', checked ? 'Server LOCKED DOWN' : 'Server UNLOCKED', { status: checked ? 'locked' : 'unlocked' });
      showMessage(checked ? 'SERVER LOCKED DOWN' : 'SERVER UNLOCKED', 'success');
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  const handleLockdownBlur = async () => {
    try {
      await setDoc(doc(db, 'system_settings', 'config'), {
        lockdownMessage
      }, { merge: true });
      await writeSystemLog('admin_action', 'admin_panel', 'Lockdown message updated', { message: lockdownMessage });
      showMessage('Lockdown message updated', 'success');
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  const handleEmailToggle = async (e) => {
    const checked = e.target.checked;
    setEmailEnabled(checked);
    try {
      await setDoc(doc(db, 'system_settings', 'config'), {
        emailEnabled: checked
      }, { merge: true });
      await writeSystemLog('admin_action', 'admin_panel', `Emails ${checked ? 'Enabled' : 'Disabled'}`, { status: checked ? 'enabled' : 'disabled' });
      showMessage(`Emails ${checked ? 'Enabled' : 'Disabled'}`, 'success');
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  const handleSaveSenderEmail = async () => {
    const email = senderEmail.trim();
    if (!email) return;
    try {
      await setDoc(doc(db, 'system_settings', 'email_config'), {
        sender_email: email
      }, { merge: true });
      await writeSystemLog('admin_action', 'admin_panel', `Sender identity updated to ${email}`, { sender: email });
      showMessage('Sender Identity Saved!', 'success');
    } catch (e) {
      showMessage(e.message, 'error');
    }
  };

  const handleEndAllSessions = async () => {
    setConfirmAction({
      message: '⚠️ End all ongoing event sessions immediately?',
      onConfirm: async () => {
        try {
          const snap = await getDocs(collection(db, 'schedules'));
          const updates = [];
          snap.forEach(docSnap => {
            if (docSnap.data().status === 'ongoing') {
              updates.push(updateDoc(doc(db, 'schedules', docSnap.id), {
                status: 'completed',
                completedAt: Timestamp.now(),
                forceEndedByIT: true
              }));
            }
          });
          await Promise.all(updates);
          showMessage(`Terminated ${updates.length} ongoing sessions.`, 'success');
        } catch (err) {
          showMessage(err.message, 'error');
        }
      }
    });
  };

  const handleFixScheduleTimes = async () => {
    setConfirmAction({
      message: 'Fix 00:00 schedule timestamps? Weekend starts set to 19:00, Weekday starts set to 16:30.',
      onConfirm: async () => {
        try {
          showMessage('Scanning timestamps...', 'success');
          const snap = await getDocs(collection(db, 'schedules'));
          let count = 0;
          const updates = [];

          snap.forEach(dSnap => {
            const data = dSnap.data();
            if (!data.date) return;
            const date = data.date.toDate();

            if (date.getHours() === 0 && date.getMinutes() === 0) {
              const day = date.getDay();
              if (day === 0 || day === 6) date.setHours(19, 0, 0, 0); // Sunday/Saturday
              else date.setHours(16, 30, 0, 0); // Weekday
              updates.push(updateDoc(doc(db, 'schedules', dSnap.id), {
                date: Timestamp.fromDate(date)
              }));
              count++;
            }
          });

          await Promise.all(updates);
          showMessage(`Corrected timestamps for ${count} schedules!`, 'success');
        } catch (err) {
          showMessage(err.message, 'error');
        }
      }
    });
  };

  const handleFixMissingClassIds = async () => {
    setConfirmAction({
      message: 'Scan schedules and auto-assign missing Class IDs using participants list overlap?',
      onConfirm: async () => {
        try {
          showMessage('Scanning classes...', 'success');
          const clsSnap = await getDocs(collection(db, 'classes'));
          const clsList = [];
          clsSnap.forEach(d => clsList.push({ id: d.id, ...d.data() }));

          if (clsList.length === 0) throw new Error('No classrooms exist to match against.');

          const schSnap = await getDocs(collection(db, 'schedules'));
          let count = 0;
          const updates = [];

          schSnap.forEach(docSnap => {
            const s = docSnap.data();
            if (s.classId) return; // Has ID

            const sParts = s.participants || [];
            const creatorEmail = s.userEmail;
            let bestMatchId = null;

            if (sParts.length > 0) {
              let maxOverlap = 0;
              for (const c of clsList) {
                const cParts = c.participants || [];
                const overlap = sParts.filter(p => cParts.includes(p)).length;
                const isSubset = sParts.every(p => cParts.includes(p));

                if (isSubset) {
                  bestMatchId = c.id;
                  break;
                }
                if (overlap > maxOverlap && (overlap / sParts.length > 0.5)) {
                  maxOverlap = overlap;
                  bestMatchId = c.id;
                }
              }
            }

            if (!bestMatchId && creatorEmail) {
              const creatorClasses = clsList.filter(c => c.participants?.includes(creatorEmail));
              if (creatorClasses.length === 1) {
                bestMatchId = creatorClasses[0].id;
              }
            }

            if (bestMatchId) {
              updates.push(updateDoc(doc(db, 'schedules', docSnap.id), { classId: bestMatchId }));
              count++;
            }
          });

          if (count === 0) {
            showMessage('No unlinked schedules could be matched.', 'error');
            return;
          }

          await Promise.all(updates);
          showMessage(`Fixed Class IDs on ${count} schedules.`, 'success');
        } catch (err) {
          showMessage(err.message, 'error');
        }
      }
    });
  };

  const handleBatchAssignBrandClass = async () => {
    setConfirmAction({
      message: '⚠️ Force assign ALL database schedules to class "iluvsunset & PGB"?\nThis overwrites existing classroom links.',
      onConfirm: async () => {
        try {
          showMessage('Locating class "iluvsunset & PGB"...', 'success');
          const q = query(collection(db, 'classes'), where('className', '==', 'iluvsunset & PGB'));
          const classSnap = await getDocs(q);
          if (classSnap.empty) throw new Error('Class "iluvsunset & PGB" not found!');
          
          const classObj = classSnap.docs[0].data();
          const newParticipants = classObj.participants || [];
          const classId = classSnap.docs[0].id;

          showMessage('Updating schedules...', 'success');
          const snap = await getDocs(collection(db, 'schedules'));
          const updates = [];
          snap.forEach(d => {
            updates.push(updateDoc(doc(db, 'schedules', d.id), {
              participants: newParticipants,
              classId: classId,
              className: 'iluvsunset & PGB'
            }));
          });

          await Promise.all(updates);
          showMessage(`Updated ${updates.length} database schedules.`, 'success');
        } catch (err) {
          showMessage(err.message, 'error');
        }
      }
    });
  };

  // Reset ALL Google Calendar Schedules + Auto-Share Rules
  const handleResetGCalSchedules = async () => {
    try {
      showMessage('Scanning Google Calendar schedules...', 'success');
      const schedSnap = await getDocs(query(collection(db, 'schedules'), where('source', '==', 'google_calendar')));
      const schedList = [];
      schedSnap.forEach(d => schedList.push({ id: d.id, ...d.data() }));

      const classSnap = await getDocs(collection(db, 'classes'));
      let classCount = 0;
      classSnap.forEach(d => {
        const data = d.data();
        if (data.gcalAutoShares && data.gcalAutoShares.length > 0) classCount++;
      });

      if (schedList.length === 0 && classCount === 0) {
        showMessage('No Google Calendar data found to reset.', 'error');
        return;
      }

      setGcalResetPreview({ schedules: schedList, classCount });
    } catch (err) {
      showMessage('Failed to scan: ' + err.message, 'error');
    }
  };

  const handleConfirmGcalReset = async () => {
    if (!gcalResetPreview) return;
    try {
      showMessage('Resetting Google Calendar data...', 'success');

      // 1. Delete all GCal-sourced schedules
      const deleteOps = gcalResetPreview.schedules.map(s => deleteDoc(doc(db, 'schedules', s.id)));
      await Promise.all(deleteOps);

      // 2. Clear gcalAutoShares from all classes
      const classSnap = await getDocs(collection(db, 'classes'));
      const classOps = [];
      let classCount = 0;
      classSnap.forEach(d => {
        const data = d.data();
        if (data.gcalAutoShares && data.gcalAutoShares.length > 0) {
          classOps.push(updateDoc(doc(db, 'classes', d.id), { gcalAutoShares: [] }));
          classCount++;
        }
      });
      await Promise.all(classOps);

      // 3. Write system log
      await addDoc(collection(db, 'system_logs'), {
        type: 'gcal_reset',
        source: 'admin',
        uid: currentUser.uid,
        userEmail: currentUser.email,
        message: `GCal reset: Deleted ${gcalResetPreview.schedules.length} schedules, cleared rules from ${classCount} classes`,
        details: { schedulesDeleted: gcalResetPreview.schedules.length, classesCleared: classCount },
        timestamp: Timestamp.now()
      });

      showMessage(`Deleted ${gcalResetPreview.schedules.length} GCal schedules & cleared rules from ${classCount} classes.`, 'success');
      setGcalResetPreview(null);
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  // Open SMTP Modal
  const handleOpenSMTP = async () => {
    setShowSMTPModal(true);
    try {
      const snap = await getDoc(doc(db, 'system_settings', 'smtp_config'));
      if (snap.exists()) {
        setSmtpConfig({ ...snap.data(), pass: '' });
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveSMTP = async (e) => {
    e.preventDefault();
    if (smtpConfig.enabled && (!smtpConfig.host || !smtpConfig.port || !smtpConfig.user)) {
      showMessage('Host, Port, and User are required to enable SMTP.', 'error');
      return;
    }
    try {
      const data = { ...smtpConfig, updatedAt: new Date() };
      if (!smtpConfig.pass) delete data.pass; // Don't wipe existing password if empty
      await setDoc(doc(db, 'system_settings', 'smtp_config'), data, { merge: true });
      await writeSystemLog('admin_action', 'admin_panel', `SMTP config updated: ${smtpConfig.enabled ? 'Enabled' : 'Disabled'}`, { host: smtpConfig.host });
      showMessage('SMTP Config saved successfully!', 'success');
      setShowSMTPModal(false);
    } catch (err) { showMessage(err.message, 'error'); }
  };

  // Open Permissions Modal
  const handleOpenPerms = async () => {
    setShowPermsModal(true);
    setPermsModalExiting(false);
    setPermsBtnState('idle');
    try {
      const snap = await getDoc(doc(db, 'system_settings', 'role_permissions'));
      setPermissionsMatrix(snap.exists() ? snap.data() : {});
    } catch (e) {}
  };

  const handleSavePerms = async () => {
    setPermsBtnState('loading');
    try {
      await setDoc(doc(db, 'system_settings', 'role_permissions'), permissionsMatrix);
      await writeSystemLog('admin_action', 'admin_panel', 'Updated role permissions matrix', { permissions_count: Object.keys(permissionsMatrix).length });
      setPermsBtnState('success');
      setTimeout(() => {
        setPermsModalExiting(true);
        setTimeout(() => {
          setShowPermsModal(false);
          setPermsModalExiting(false);
          setPermsBtnState('idle');
        }, 180);
      }, 600);
    } catch (err) { 
      setPermsBtnState('error');
      showMessage(err.message, 'error'); 
      setTimeout(() => setPermsBtnState('idle'), 2000);
    }
  };

  // Open Email Rules Modal
  const handleOpenRules = async () => {
    setShowRulesModal(true);
    setRulesModalExiting(false);
    setRulesBtnState('idle');
    try {
      const snap = await getDoc(doc(db, 'system_settings', 'mail_rules'));
      setMailRules(snap.exists() ? snap.data() : {});
    } catch (e) {}
  };

  const handleSaveRules = async () => {
    setRulesBtnState('loading');
    try {
      await setDoc(doc(db, 'system_settings', 'mail_rules'), mailRules);
      await writeSystemLog('admin_action', 'admin_panel', 'Updated mail delivery rules', { rules_count: Object.keys(mailRules).length });
      setRulesBtnState('success');
      setTimeout(() => {
        setRulesModalExiting(true);
        setTimeout(() => {
          setShowRulesModal(false);
          setRulesModalExiting(false);
          setRulesBtnState('idle');
        }, 180);
      }, 600);
    } catch (err) { 
      setRulesBtnState('error');
      showMessage(err.message, 'error'); 
      setTimeout(() => setRulesBtnState('idle'), 2000);
    }
  };

  // Send system Broadcast
  const handleSendBroadcast = async () => {
    const msg = broadcastMsg.trim();
    if (!msg) return;
    try {
      await setDoc(doc(db, 'system_settings', 'announcements'), {
        message: msg,
        timestamp: Timestamp.now(),
        sender: 'Admin'
      });
      await writeSystemLog('admin_action', 'admin_panel', `Sent system broadcast: ${msg.substring(0, 50)}...`, { message_length: msg.length });
      showMessage('Broadcast alert sent!', 'success');
      setShowBroadcastModal(false);
      setBroadcastMsg('');
    } catch (err) { showMessage(err.message, 'error'); }
  };

  // Send Test Simulator email
  const handleSendTestEmail = async () => {
    const target = testRecipient.trim();
    if (!target) {
      showMessage('Recipient email is required.', 'error');
      return;
    }
    showMessage(`Simulating ${testTemplate}...`, 'success');
    try {
      const idToken = await auth.currentUser.getIdToken();
      let subject = 'Simulation test email';
      let data = {};

      if (testTemplate === 'schedule_created') {
        subject = 'New Event: Science Lab (Test)';
        data = { place: 'Science Lab', time: '11:00 AM', date: 'Tomorrow', notes: 'Prepare goggles.', link: window.location.origin };
      } else if (testTemplate === 'schedule_reminder') {
        subject = 'Reminder: Oral Presentation';
        data = { place: 'Oral Presentation', time: '1:00 PM', date: 'Today', link: window.location.origin };
      } else if (testTemplate === 'review_sent') {
        subject = 'Lesson Review: Literature';
        data = { place: 'Literature 10A', review_snippet: 'Well done writing your essays!', link: window.location.origin };
      } else if (testTemplate === 'class_invite') {
        subject = 'You have been added to Class 12B';
        data = { class_name: 'Class 12B (Test)', link: window.location.origin };
      }

      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({
          to_email: target,
          to_name: target.split('@')[0],
          subject: subject,
          email_type: testTemplate,
          template_data: data
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Server Error');

      if (result.success === false) {
        showMessage('Blocked by Rules: ' + result.message, 'error');
      } else {
        await writeSystemLog('admin_action', 'admin_panel', `Sent test email to ${target}`, { recipient: target, template: testTemplate });
        showMessage('Simulated email sent successfully!', 'success');
        setShowTestEmailModal(false);
      }
    } catch (err) { showMessage(err.message, 'error'); }
  };

  const isIT = userRole === 'it';

  return (
    <div className="screen active" style={{ display: 'flex' }}>
      <WebGLBackground />

      <div className="dashboard-container" style={{ width: '100%' }}>
        <Topbar />
        
        <div className="dashboard-body">
          {/* Left Sidebar Console Navigation */}
          <aside className="sidebar">
            <nav className="nav-section">
              <div className="nav-section-label">Console</div>
              
              <a 
                href="#" 
                className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setActiveTab('users'); }}
              >
                <Users size={18} style={{ marginRight: '6px' }} />
                Users Management
              </a>

              <a 
                href="#" 
                className={`nav-item ${activeTab === 'classes' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setActiveTab('classes'); }}
              >
                <BookOpen size={18} style={{ marginRight: '6px' }} />
                Classes & Enrollment
              </a>

              {isIT && (
                <a 
                  href="#" 
                  className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setActiveTab('settings'); }}
                >
                  <Settings size={18} style={{ marginRight: '6px' }} />
                  System Config
                </a>
              )}
              {isIT && (
                <a 
                  href="#" 
                  className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setActiveTab('logs'); }}
                >
                  <ScrollText size={18} style={{ marginRight: '6px' }} />
                  System Logs
                </a>
              )}
            </nav>

            <div style={{ marginTop: 'auto' }}>
              <Link to="/" className="nav-item">
                <ArrowLeft size={18} style={{ marginRight: '6px' }} />
                Back to App
              </Link>
            </div>
          </aside>

          {/* Right Main Content Column */}
          <main className="main-content">
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading admin console database...
              </div>
            ) : (
              <>
                {/* ── ADMIN STATS ROW ── */}
                <div className="admin-stats-row">
                  <div className="stat-card">
                    <div className="stat-label">Total Users</div>
                    <div className="stat-value">{users.length}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Classrooms</div>
                    <div className="stat-value">{classes.length}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">System Status</div>
                    <div className="stat-value" style={{ color: lockdownMode ? 'var(--color-error)' : 'var(--color-success)' }}>
                      {lockdownMode ? 'LOCKED' : 'NORMAL'}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Email Integration</div>
                    <div className="stat-value" style={{ color: emailEnabled ? 'var(--color-success)' : 'var(--color-warning)' }}>
                      {emailEnabled ? 'ACTIVE' : 'MUTED'}
                    </div>
                  </div>
                </div>

                {/* ── USERS TAB ── */}
                {activeTab === 'users' && (
                  <div className="admin-dashboard-grid">
                    {/* Left Column: Users list */}
                    <div className="content-panel" style={{ height: 'auto' }}>
                      <div className="panel-header">
                        <h2>Allowed Users Access List</h2>
                      </div>
                      
                      <div className="search-input-wrapper" style={{ marginBottom: '16px' }}>
                        <span className="search-icon">
                          <Search size={18} />
                        </span>
                        <input 
                          type="text" 
                          placeholder="Search allowed users by email..."
                          value={userSearch}
                          onChange={e => setUserSearch(e.target.value)}
                        />
                      </div>

                      <div className="scrollable-list">
                        {filteredUsers.length === 0 ? (
                          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No matching users found.
                          </div>
                        ) : (
                          filteredUsers.map(u => (
                            <div key={u.id} className="list-item" style={{ marginBottom: '8px' }}>
                              <div className="item-main">
                                <span className="item-title">{u.email}</span>
                                <span className="item-subtitle" style={{ marginLeft: '10px' }}>
                                  <span className={`badge badge-${u.role}`}>{u.role.replace('_', ' ')}</span>
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn-icon" onClick={() => handleKickUser(u.id)} title="Force Logout (Kick)" style={{ color: 'var(--color-warning)' }}>
                                  <LogOut size={16} />
                                </button>
                                <button className="btn-icon danger" onClick={() => handleRevokeUser(u.id)} title="Revoke Access (Ban)">
                                  <UserX size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Right Column: Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div className="content-panel" style={{ height: 'auto' }}>
                        <div className="section-title">
                          <UserPlus size={18} style={{ marginRight: '6px' }} />
                          Invite New User
                        </div>
                        <form onSubmit={handleInviteUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                          <div className="form-group">
                            <label>Email Address</label>
                            <input 
                              type="email" 
                              placeholder="user@example.com" 
                              required 
                              value={inviteEmail} 
                              onChange={e => setInviteEmail(e.target.value)} 
                            />
                          </div>
                          <div className="form-group">
                            <label>System Role</label>
                            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                              <option value="student">Student</option>
                              <option value="teacher">Teacher</option>
                              <option value="senior_teacher">Senior Teacher</option>
                              <option value="academic_coordinator">Academic Coordinator</option>
                              <option value="it">IT Admin</option>
                            </select>
                          </div>
                          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '6px' }}>
                            Send Invite Access
                          </button>
                        </form>
                      </div>

                      <div className="content-panel" style={{ height: 'auto' }}>
                        <div className="section-title">
                          <PieChart size={18} style={{ marginRight: '6px' }} />
                          Role Breakdown
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                          {[
                            { role: 'student', label: 'Students', color: '#34d399' },
                            { role: 'teacher', label: 'Teachers', color: '#60a5fa' },
                            { role: 'senior_teacher', label: 'Senior Teachers', color: '#818cf8' },
                            { role: 'academic_coordinator', label: 'Coordinators', color: '#fbbf24' },
                            { role: 'it', label: 'IT Administrators', color: '#a78bfa' }
                          ].map(roleItem => {
                            const count = users.filter(u => u.role === roleItem.role).length;
                            return (
                              <div key={roleItem.role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-subtle)', padding: '10px 14px', borderRadius: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>{roleItem.label}</span>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: roleItem.color }}>{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── CLASSES TAB ── */}
                {activeTab === 'classes' && (
                  <div className="admin-dashboard-grid">
                    {/* Left Column: Classes list */}
                    <div className="content-panel" style={{ height: 'auto' }}>
                      <div className="panel-header">
                        <h2>Active Academic Classrooms</h2>
                      </div>

                      <div className="search-input-wrapper" style={{ marginBottom: '16px' }}>
                        <span className="search-icon">
                          <Search size={18} />
                        </span>
                        <input 
                          type="text" 
                          placeholder="Search classrooms..."
                          value={classSearch}
                          onChange={e => setClassSearch(e.target.value)}
                        />
                      </div>

                      <div className="scrollable-list">
                        {filteredClasses.length === 0 ? (
                          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No classrooms found.
                          </div>
                        ) : (
                          filteredClasses.map(c => (
                            <div key={c.id} className="list-item" style={{ marginBottom: '8px' }}>
                              <div className="item-main">
                                <span className="item-title">{c.className}</span>
                                <span className="item-subtitle" style={{ marginLeft: '12px' }}>
                                  {c.participants ? c.participants.length : 0} Enrolled Members
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn-icon" onClick={() => handleOpenEditClass(c)} title="Edit Classroom Enrollment">
                                  <Edit size={16} />
                                </button>
                                <button className="btn-icon danger" onClick={() => handleDeleteClass(c.id)} title="Delete Classroom">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Right Column: Actions & Sync Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div className="content-panel" style={{ height: 'auto' }}>
                        <div className="section-title">
                          <PlusSquare size={18} style={{ marginRight: '6px' }} />
                          Create Classroom
                        </div>
                        <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                          <div className="form-group">
                            <label>Classroom Title</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Science Grade 11A" 
                              required 
                              value={newClassName} 
                              onChange={e => setNewClassName(e.target.value)} 
                            />
                          </div>
                          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '6px' }}>
                            Create Classroom
                          </button>
                        </form>
                      </div>

                      <div className="content-panel" style={{ height: 'auto' }}>
                        <div className="section-title">
                          <Monitor size={18} style={{ marginRight: '6px' }} />
                          Class Contexts & Rules
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginTop: '10px' }}>
                          Classrooms serve as security contexts. When teachers create a schedule, they target a specific Classroom. Only students enrolled in that Classroom will have authorization to view the schedule.
                        </p>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginTop: '8px' }}>
                          To link older unassigned schedules to new class rosters, open a class's settings and click <strong>"Link Matching Schedules to Class"</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── SYSTEM SETTINGS TAB (IT ONLY) ── */}
                {activeTab === 'settings' && isIT && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="content-panel" style={{ height: 'auto' }}>
                      <div className="panel-header">
                        <h2>System Settings & IT Configurations</h2>
                      </div>
                      
                      <motion.div 
                        className="it-grid" 
                        style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}
                        initial="hidden"
                        animate="visible"
                        variants={{
                          hidden: { opacity: 0 },
                          visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                        }}
                      >
                        {/* Server Lockdown */}
                        <motion.div 
                          className="glass-it-card" 
                          variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                          style={{ borderTop: '4px solid rgba(239, 68, 68, 0.5)' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ color: 'var(--color-error)', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' }}>
                              <Server size={18} /> SERVER LOCKDOWN
                            </h4>
                            <label className="ios-toggle">
                              <input type="checkbox" checked={lockdownMode} onChange={handleLockdownChange} />
                              <span className="slider" />
                            </label>
                          </div>
                          <input 
                            type="text" 
                            placeholder="Reason for lockdown..." 
                            value={lockdownMessage} 
                            onChange={e => setLockdownMessage(e.target.value)} 
                            onBlur={handleLockdownBlur}
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', marginBottom: '12px', borderRadius: '10px', padding: '10px 14px', width: '100%' }} 
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: lockdownMode ? 'var(--color-error)' : 'var(--color-success)', boxShadow: `0 0 10px ${lockdownMode ? 'var(--color-error)' : 'var(--color-success)'}` }} />
                            Status: <span style={{ fontWeight: 600, color: lockdownMode ? 'var(--color-error)' : 'var(--text-primary)' }}>{lockdownMode ? 'SYSTEM LOCKED' : 'NORMAL'}</span>
                          </div>
                        </motion.div>

                        {/* Emergency Actions */}
                        <motion.div 
                          className="glass-it-card" 
                          variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                          style={{ borderTop: '4px solid rgba(245, 158, 11, 0.5)' }}
                        >
                          <h4 style={{ color: 'var(--color-warning)', fontSize: '15px', marginBottom: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' }}>
                            <AlertTriangle size={18} /> EMERGENCY ACTIONS
                          </h4>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                            Force-complete all ongoing live schedule contexts instantly. Use only in severe anomalies.
                          </p>
                          <button onClick={handleEndAllSessions} className="glow-button btn btn-full" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '12px', fontSize: '13px', justifyContent: 'center' }}>
                            Terminate All Active Sessions
                          </button>
                        </motion.div>

                        {/* Email System */}
                        <motion.div 
                          className="glass-it-card" 
                          variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                          style={{ borderTop: '4px solid rgba(6, 182, 212, 0.5)' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ color: 'var(--color-info)', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' }}>
                              <Mail size={18} /> EMAIL SYSTEM
                            </h4>
                            <label className="ios-toggle">
                              <input type="checkbox" checked={emailEnabled} onChange={handleEmailToggle} />
                              <span className="slider" />
                            </label>
                          </div>
                          
                          <div style={{ marginBottom: '16px', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Sender Identity</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input 
                                type="text" 
                                value={senderEmail} 
                                onChange={e => setSenderEmail(e.target.value)} 
                                placeholder="noreply@example.com" 
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', padding: '8px 12px', borderRadius: '8px', flex: 1, width: '100%' }} 
                              />
                              <button className="glow-button btn" onClick={handleSaveSenderEmail} style={{ padding: '0 16px', borderRadius: '8px', color: 'var(--color-info)' }}>Save</button>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button onClick={handleOpenRules} className="glow-button btn" style={{ fontSize: '12px', padding: '10px', color: 'var(--text-primary)', justifyContent: 'center' }}>Rules Matrix</button>
                            <button onClick={() => { setSmtpConfig({ enabled: false, host:'', port:587, user:'', pass:'' }); handleOpenSMTP(); }} className="glow-button btn" style={{ fontSize: '12px', padding: '10px', color: 'var(--text-primary)', justifyContent: 'center' }}>SMTP Config</button>
                            <button onClick={() => { setTestRecipient(currentUser.email); setShowTestEmailModal(true); }} className="glow-button btn" style={{ fontSize: '12px', padding: '10px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', justifyContent: 'center' }}>Simulator</button>
                          </div>
                        </motion.div>

                        {/* Database Tools */}
                        <motion.div 
                          className="glass-it-card" 
                          variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                          style={{ borderTop: '4px solid rgba(59, 130, 246, 0.5)', gridRow: 'span 2' }}
                        >
                          <h4 style={{ color: 'var(--brand-primary-hover)', fontSize: '15px', marginBottom: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' }}>
                            <Database size={18} /> DATABASE TOOLS
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button onClick={handleFixScheduleTimes} className="glow-button btn btn-full" style={{ fontSize: '13px', padding: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px' }}>
                              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wrench size={14}/></div>
                              Fix Schedule Times (00:00)
                            </button>
                            <button onClick={handleFixMissingClassIds} className="glow-button btn btn-full" style={{ fontSize: '13px', padding: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px' }}>
                              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LinkIcon size={14}/></div>
                              Fix Missing Class IDs
                            </button>
                            <button onClick={handleOpenPerms} className="glow-button btn btn-full" style={{ fontSize: '13px', padding: '12px', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px' }}>
                              <div style={{ background: 'rgba(251, 191, 36, 0.15)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={14}/></div>
                              Role Permissions Matrix
                            </button>
                            <button onClick={() => { setBroadcastMsg(''); setShowBroadcastModal(true); }} className="glow-button btn btn-full" style={{ fontSize: '13px', padding: '12px', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px' }}>
                              <div style={{ background: 'rgba(52, 211, 153, 0.15)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Megaphone size={14}/></div>
                              Broadcast Alert
                            </button>
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
                            <button onClick={handleResetGCalSchedules} className="glow-button btn btn-full" style={{ fontSize: '13px', padding: '12px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px' }}>
                              <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CalendarX2 size={14}/></div>
                              Reset GCal Schedules
                            </button>
                          </div>
                        </motion.div>

                        {/* Force Override Context */}
                        <motion.div 
                          className="glass-it-card" 
                          variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                          style={{ borderTop: '4px solid rgba(139, 92, 246, 0.5)' }}
                        >
                          <h4 style={{ color: '#a78bfa', fontSize: '15px', marginBottom: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' }}>
                            <FastForward size={18} /> FORCE OVERRIDE
                          </h4>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                            Quick utility: Force link ALL database schedules to class "iluvsunset & PGB" and assign enrollment rosters.
                          </p>
                          <button onClick={handleBatchAssignBrandClass} className="glow-button btn btn-full" style={{ color: '#a78bfa', borderColor: 'rgba(167, 139, 250, 0.3)', padding: '12px', fontSize: '13px', justifyContent: 'center' }}>
                            Override All Contexts
                          </button>
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>
                )}

                {/* ── SYSTEM LOGS TAB (IT ONLY) ── */}
                {activeTab === 'logs' && isIT && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="content-panel" style={{ height: 'auto' }}>
                      <div className="panel-header">
                        <h2>System Activity Logs</h2>
                      </div>

                      {/* Filter Chips */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        {[
                          { key: 'all', label: 'All' },
                          { key: 'admin_action', label: '🔧 Admin' },
                          { key: 'webhook', label: '🔗 Webhook' },
                          { key: 'cron', label: '⏰ Cron' },
                          { key: 'gcal_reset', label: '🗑️ Reset' },
                          { key: 'channel_renewal', label: '🔄 Renewal' },
                        ].map(chip => (
                          <button
                            key={chip.key}
                            onClick={() => setLogFilter(chip.key)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 600,
                              border: '1px solid',
                              borderColor: logFilter === chip.key ? 'var(--brand-primary)' : 'var(--border-default)',
                              background: logFilter === chip.key ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                              color: logFilter === chip.key ? 'var(--brand-primary-hover)' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>

                      {/* Logs Feed */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
                        {logsLoading ? (
                          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading logs...</div>
                        ) : systemLogs.filter(l => logFilter === 'all' || l.type === logFilter).length === 0 ? (
                          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                            <ScrollText size={40} style={{ color: 'var(--text-secondary)', opacity: 0.3, marginBottom: '12px' }} />
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No system logs yet.</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', opacity: 0.6 }}>Logs will appear here when webhooks fire or cron jobs run.</p>
                          </div>
                        ) : (
                          systemLogs
                            .filter(l => logFilter === 'all' || l.type === logFilter)
                            .map(log => {
                              const typeColors = {
                                admin_action: { border: '#f97316', bg: 'rgba(249,115,22,0.08)', badge: '#f97316', label: 'ADMIN' },
                                webhook: { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)', badge: '#3b82f6', label: 'WEBHOOK' },
                                cron: { border: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', badge: '#8b5cf6', label: 'CRON' },
                                gcal_reset: { border: '#ef4444', bg: 'rgba(239,68,68,0.08)', badge: '#ef4444', label: 'RESET' },
                                channel_renewal: { border: '#10b981', bg: 'rgba(16,185,129,0.08)', badge: '#10b981', label: 'RENEWAL' },
                              };
                              const style = typeColors[log.type] || typeColors.webhook;

                              // Relative time
                              let timeAgo = '';
                              if (log.timestamp) {
                                const ts = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                                const diffMs = Date.now() - ts.getTime();
                                const diffMin = Math.floor(diffMs / 60000);
                                if (diffMin < 1) timeAgo = 'just now';
                                else if (diffMin < 60) timeAgo = `${diffMin}m ago`;
                                else if (diffMin < 1440) timeAgo = `${Math.floor(diffMin / 60)}h ago`;
                                else timeAgo = `${Math.floor(diffMin / 1440)}d ago`;
                              }

                              return (
                                <div
                                  key={log.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px',
                                    padding: '14px 16px',
                                    background: style.bg,
                                    borderRadius: '10px',
                                    borderLeft: `3px solid ${style.border}`,
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                      <span style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        background: `${style.badge}22`,
                                        color: style.badge
                                      }}>
                                        {style.label}
                                      </span>
                                      {log.userEmail && (
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{log.userEmail}</span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                                      {log.message}
                                    </div>
                                    {log.details && (
                                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                        {Object.entries(log.details).map(([k, v]) => (
                                          <span key={k}>{k.replace(/_/g, ' ')}: <strong style={{ color: 'var(--text-primary)' }}>{v}</strong></span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    {timeAgo}
                                  </span>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* ── EDIT CLASS MODAL ── */}
      {editClass && (
        <div className="modal active" onClick={(e) => e.target.classList.contains('modal') && setEditClass(null)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit: {editClass.className}</h3>
              <button className="modal-close" onClick={() => setEditClass(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label style={{ marginBottom: '12px', display: 'block' }}>Enrolled Members</label>
                <div className="checkbox-list">
                  {allUsersForClass.map(u => (
                    <label key={u.email} className="checkbox-item">
                      <input 
                        type="checkbox" 
                        checked={classParticipants.includes(u.email)} 
                        onChange={() => handleToggleClassParticipant(u.email)} 
                      />
                      <span>
                        {u.email} 
                        <span style={{ fontSize: '10px', opacity: 0.6, border: '1px solid currentColor', padding: '1px 4px', borderRadius: '4px', marginLeft: '6px' }}>{u.role}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary btn-full" onClick={handleSaveEnrollment} style={{ marginTop: '16px' }}>Save Changes</button>
              
              <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid var(--border-default)' }} />

              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--brand-primary-hover)', marginBottom: '8px' }}>Schedule Sync Management</div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Link all existing database schedules containing these students to this classroom context automatically.
                </p>
                <button className="btn btn-secondary btn-full" onClick={handleLinkClassSchedules} style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--brand-primary-hover)', fontSize: '13px' }}>
                  🔄 Link Matching Schedules to Class
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ROLE PERMISSIONS MODAL ── */}
      {showPermsModal && (
        <div className={`modal apple-modal-overlay active ${permsModalExiting ? 'exiting' : ''}`} style={{display:'flex', alignItems:'center', justifyContent:'center'}} onClick={(e) => {
          if(e.target.classList.contains('apple-modal-overlay')) {
            setPermsModalExiting(true);
            setTimeout(() => { setShowPermsModal(false); setPermsModalExiting(false); }, 180);
          }
        }}>
          <div className="apple-modal-surface" style={{ width: '100%', maxWidth: '600px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div className="apple-modal-title">Role Permissions matrix</div>
                <div className="apple-modal-description" style={{ marginTop: '4px' }}>Configure global dynamic overrides for classroom role permissions.</div>
              </div>
              <button className="apple-modal-close" onClick={() => {
                setPermsModalExiting(true);
                setTimeout(() => { setShowPermsModal(false); setPermsModalExiting(false); }, 180);
              }}>×</button>
            </div>
            
            <div className="apple-modal-list-container">
              <div className="apple-modal-list-scrollable">
                {[
                  { id: 'create_schedule', label: 'Create Schedule' },
                  { id: 'edit_schedule', label: 'Edit Schedule' },
                  { id: 'delete_schedule', label: 'Delete Schedule' },
                  { id: 'invite_user', label: 'Invite Users' },
                  { id: 'manage_classes', label: 'Manage Classes' },
                  { id: 'view_all', label: 'View All (Global Mode)' }
                ].map((action, idx) => (
                  <div key={action.id} className="apple-list-row" style={{ '--stagger-idx': idx }}>
                    <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '12px', color: 'white' }}>{action.label}</div>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      {['student', 'teacher', 'senior_teacher', 'academic_coordinator'].map(role => {
                        const key = `${action.id}_${role}`;
                        let defaultVal = false;
                        if (role === 'academic_coordinator') defaultVal = true;
                        if (['teacher', 'senior_teacher'].includes(role) && ['create_schedule', 'edit_schedule', 'delete_schedule'].includes(action.id)) defaultVal = true;
                        const isChecked = permissionsMatrix[key] !== undefined ? permissionsMatrix[key] : defaultVal;

                        return (
                          <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              className="apple-toggle"
                              checked={isChecked} 
                              onChange={(e) => {
                                setPermissionsMatrix(prev => ({ ...prev, [key]: e.target.checked }));
                                e.target.closest('.apple-list-row').classList.remove('flash');
                                void e.target.closest('.apple-list-row').offsetWidth;
                                e.target.closest('.apple-list-row').classList.add('flash');
                              }}
                            />
                            {role.replace('_', ' ')}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: '20px' }}>
                <button 
                  className={`apple-btn-save ${permsBtnState === 'loading' ? 'loading' : ''} ${permsBtnState === 'success' ? 'success' : ''} ${permsBtnState === 'error' ? 'error' : ''}`} 
                  onClick={handleSavePerms}
                >
                  <span className="label">Save Permissions</span>
                  <div className="spinner"></div>
                  <div className="checkmark-success"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BROADCAST MSG MODAL ── */}
      {showBroadcastModal && (
        <div className="modal active" onClick={(e) => e.target.classList.contains('modal') && setShowBroadcastModal(false)}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>System Alert Broadcast</h3>
              <button className="modal-close" onClick={() => setShowBroadcastModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <textarea 
                rows="4" 
                placeholder="Type your system announcement message..." 
                value={broadcastMsg}
                onChange={e => setBroadcastMsg(e.target.value)}
                style={{ marginBottom: '12px' }}
              />
              <button className="btn btn-success btn-full" onClick={handleSendBroadcast}>Send Alert</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EMAIL RULES CONFIG MODAL ── */}
      {showRulesModal && (
        <div className={`modal apple-modal-overlay active ${rulesModalExiting ? 'exiting' : ''}`} style={{display:'flex', alignItems:'center', justifyContent:'center'}} onClick={(e) => {
          if(e.target.classList.contains('apple-modal-overlay')) {
            setRulesModalExiting(true);
            setTimeout(() => { setShowRulesModal(false); setRulesModalExiting(false); }, 180);
          }
        }}>
          <div className="apple-modal-surface" style={{ width: '100%', maxWidth: '600px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div className="apple-modal-title">Email rules</div>
                <div className="apple-modal-description" style={{ marginTop: '4px' }}>Select which automated notifications are dispatched to which user roles.</div>
              </div>
              <button className="apple-modal-close" onClick={() => {
                setRulesModalExiting(true);
                setTimeout(() => { setShowRulesModal(false); setRulesModalExiting(false); }, 180);
              }}>×</button>
            </div>

            <div className="apple-modal-list-container">
              {[
                { id: 'schedule_created', label: 'New Schedule Notifications' },
                { id: 'schedule_reminder', label: 'Schedule Reminders' },
                { id: 'class_invite', label: 'Class Enrollment Invites' },
                { id: 'review_sent', label: 'Lesson Reviews' }
              ].map((type, idx) => (
                <div key={type.id} className="apple-list-row" style={{ '--stagger-idx': idx }}>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '12px', color: 'white' }}>{type.label}</div>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {['student', 'teacher', 'senior_teacher', 'academic_coordinator'].map(role => {
                      const key = `${type.id}_${role}`;
                      const isChecked = mailRules[key] !== false; // Default true

                      return (
                        <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            className="apple-toggle"
                            checked={isChecked} 
                            onChange={(e) => {
                              setMailRules(prev => ({ ...prev, [key]: e.target.checked }));
                              e.target.closest('.apple-list-row').classList.remove('flash');
                              void e.target.closest('.apple-list-row').offsetWidth;
                              e.target.closest('.apple-list-row').classList.add('flash');
                            }}
                          />
                          {role.replace('_', ' ')}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              <div style={{ marginTop: '20px' }}>
                <button 
                  className={`apple-btn-save ${rulesBtnState === 'loading' ? 'loading' : ''} ${rulesBtnState === 'success' ? 'success' : ''} ${rulesBtnState === 'error' ? 'error' : ''}`} 
                  onClick={handleSaveRules}
                >
                  <span className="label">Save Rules</span>
                  <div className="spinner"></div>
                  <div className="checkmark-success"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TEST EMAIL MODAL ── */}
      {showTestEmailModal && (
        <div className="modal active" onClick={(e) => e.target.classList.contains('modal') && setShowTestEmailModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Email System Simulator</h3>
              <button className="modal-close" onClick={() => setShowTestEmailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Template Type</label>
                <select value={testTemplate} onChange={e => setTestTemplate(e.target.value)}>
                  <option value="schedule_created">New Schedule Created</option>
                  <option value="schedule_reminder">Schedule Reminder</option>
                  <option value="review_sent">Lesson Review Sent</option>
                  <option value="class_invite">Class Invitation</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Recipient Email</label>
                <input 
                  type="email" 
                  value={testRecipient} 
                  onChange={e => setTestRecipient(e.target.value)} 
                  placeholder="name@example.com" 
                />
              </div>
              <button className="btn btn-primary btn-full" onClick={handleSendTestEmail}>🚀 Simulate & Send</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SMTP MODAL ── */}
      {showSMTPModal && (
        <div className="modal active" onClick={(e) => e.target.classList.contains('modal') && setShowSMTPModal(false)}>
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>SMTP Configuration</h3>
              <button className="modal-close" onClick={() => setShowSMTPModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSaveSMTP}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Enable Custom SMTP</span>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={smtpConfig.enabled} 
                      onChange={e => setSmtpConfig(prev => ({ ...prev, enabled: e.target.checked }))} 
                    />
                    <span className="slider" />
                  </label>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '11px' }}
                    onClick={() => setSmtpConfig(prev => ({ ...prev, host: 'smtp.gmail.com', port: 465 }))}
                  >
                    Gmail
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ flex: 2 }}>
                    <label>Host</label>
                    <input 
                      type="text" 
                      value={smtpConfig.host} 
                      onChange={e => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                      placeholder="smtp.example.com" 
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Port</label>
                    <input 
                      type="number" 
                      value={smtpConfig.port} 
                      onChange={e => setSmtpConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
                      placeholder="587" 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Username / API Key</label>
                  <input 
                    type="text" 
                    value={smtpConfig.user} 
                    onChange={e => setSmtpConfig(prev => ({ ...prev, user: e.target.value }))}
                    placeholder="user@example.com" 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label>Password / Secret Key</label>
                  <input 
                    type="password" 
                    value={smtpConfig.pass} 
                    onChange={e => setSmtpConfig(prev => ({ ...prev, pass: e.target.value }))}
                    placeholder="••••••••" 
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-full">Save SMTP Settings</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── GCAL RESET PREVIEW MODAL ── */}
      {gcalResetPreview && (
        <div className="modal active" onClick={(e) => e.target.classList.contains('modal') && setGcalResetPreview(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>⚠️ GCal Schedules to Delete</h3>
              <button className="modal-close" onClick={() => setGcalResetPreview(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                The following <strong style={{ color: 'var(--color-error)' }}>{gcalResetPreview.schedules.length}</strong> Google Calendar schedules will be permanently deleted
                {gcalResetPreview.classCount > 0 && <>, and auto-share rules will be cleared from <strong style={{ color: 'var(--color-error)' }}>{gcalResetPreview.classCount}</strong> class{gcalResetPreview.classCount > 1 ? 'es' : ''}</>}.
              </p>

              <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                {(() => {
                  // Group by event name
                  const groups = {};
                  gcalResetPreview.schedules.forEach(s => {
                    const name = s.place || 'Untitled';
                    if (!groups[name]) groups[name] = { name, items: [] };
                    groups[name].items.push(s);
                  });
                  return Object.values(groups).map(group => (
                    <div key={group.name} style={{
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.12)',
                      borderRadius: '10px',
                      padding: '12px 14px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                            📅 {group.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {group.items.length} event{group.items.length > 1 ? 's' : ''}
                            {group.items[0].className && ` · ${group.items[0].className}`}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: 'var(--color-error)',
                          textTransform: 'uppercase'
                        }}>
                          DELETE
                        </span>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => setGcalResetPreview(null)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleConfirmGcalReset} style={{ flex: 1, fontWeight: 700 }}>
                  Delete All ({gcalResetPreview.schedules.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmAction}
        message={confirmAction?.message}
        onConfirm={confirmAction?.onConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
