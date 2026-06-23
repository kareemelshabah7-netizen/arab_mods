import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDocs, collection, onSnapshot, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { 
  Shield, 
  Sparkles, 
  Layers, 
  Download, 
  MessageSquare, 
  User, 
  PlusCircle, 
  CheckCircle, 
  Eye, 
  Trash2, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Search, 
  BookOpen, 
  Compass, 
  Star,
  Info,
  Sliders,
  Award,
  AlertTriangle,
  UploadCloud,
  FileText,
  Clock,
  EyeOff
} from 'lucide-react';

// تهيئة وإعداد Firebase وقراءة الإعدادات من البيئة
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'minecraft-mods-portal';

// دالة لتشغيل صوت الـ Level Up الكلاسيكي من ماين كرافت عند التفاعل الناجح
const playLevelUpSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(523.25, now); // نغمة C5
    gain.gain.setValueAtTime(0.15, now);
    
    osc.frequency.setValueAtTime(659.25, now + 0.08); // نغمة E5
    osc.frequency.setValueAtTime(783.99, now + 0.16); // نغمة G5
    osc.frequency.setValueAtTime(1046.50, now + 0.24); // نغمة C6
    
    gain.gain.setValueAtTime(0.15, now + 0.24);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    
    osc.start(now);
    osc.stop(now + 0.6);
  } catch (e) {
    console.log("Audio play blocked or not supported", e);
  }
};

export default function App() {
  const [user, setUser] = useState(null); 
  const [currentUserProfile, setCurrentUserProfile] = useState(null); 
  const [mods, setMods] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [comments, setComments] = useState([]);
  
  // نظام الصفحات الرئيسي
  const [currentPage, setCurrentPage] = useState('home'); // 'home' (الصفحة الرئيسية للمودات المعتمدة) أو 'upload_page' (صفحة الرفع والمتابعة)
  
  // حالات واجهة المستخدم وتصفية الصفحة الرئيسية
  const [activeTab, setActiveTab] = useState('all'); // الفئات: all, mods, resourcepacks, modpacks, datapacks, owner_mods
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMod, setSelectedMod] = useState(null);
  
  // النوافذ المنبثقة للتوثيق والدخول
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' أو 'register'
  
  // مدخلات الحساب والتعليق
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  
  // مدخلات المود الجديد
  const [modTitle, setModTitle] = useState('');
  const [modDescription, setModDescription] = useState('');
  const [modCategory, setModCategory] = useState('mods'); 
  const [modDownloadUrl, setModDownloadUrl] = useState('');
  const [modImageUrl, setModImageUrl] = useState('');
  const [modCreatorBio, setModCreatorBio] = useState('');
  
  const [newCommentText, setNewCommentText] = useState('');
  const [notification, setNotification] = useState(null);

  // بيانات حساب المالك الحصرية
  const OWNER_EMAIL = "Ktg3mr10@gmail.com";
  const OWNER_PASS = "k@4eem@mr3mk";

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // التأكد من تسجيل الدخول والمستمع لحالة الحساب
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
        showToast("فشل الاتصال التلقائي بالخادم", "error");
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
    });
    return () => unsubscribe();
  }, []);

  // جلب البيانات من قاعدة بيانات Firestore وتحديثها في الوقت الفعلي
  useEffect(() => {
    if (!user) return;

    // جلب جميع المودات والملفات
    const modsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'mods');
    const unsubscribeMods = onSnapshot(modsCollection, (snapshot) => {
      const modsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMods(modsData);
    }, (error) => {
      console.error("Error fetching mods:", error);
    });

    // جلب بيانات الحسابات وصناع المحتوى
    const usersCollection = collection(db, 'artifacts', appId, 'public', 'data', 'users_metadata');
    const unsubscribeUsers = onSnapshot(usersCollection, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(usersData);
      
      const savedSession = localStorage.getItem(`mc_user_${appId}`);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        const latestProfile = usersData.find(u => u.email.toLowerCase() === parsed.email.toLowerCase());
        if (latestProfile) {
          setCurrentUserProfile(latestProfile);
        }
      }
    }, (error) => {
      console.error("Error fetching users:", error);
    });

    // جلب التعليقات
    const commentsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'comments');
    const unsubscribeComments = onSnapshot(commentsCollection, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComments(commentsData);
    }, (error) => {
      console.error("Error fetching comments:", error);
    });

    return () => {
      unsubscribeMods();
      unsubscribeUsers();
      unsubscribeComments();
    };
  }, [user]);

  // إنشاء حساب جديد وعضوية جديدة
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!usernameInput || !emailInput || !passwordInput) {
      showToast("يرجى ملء جميع الحقول المطلوبة!", "error");
      return;
    }

    const emailLower = emailInput.trim().toLowerCase();
    
    const existing = usersList.find(u => u.email.toLowerCase() === emailLower);
    if (existing) {
      showToast("هذا البريد الإلكتروني مسجل بالفعل!", "error");
      return;
    }

    const isOwner = (emailLower === OWNER_EMAIL.toLowerCase() && passwordInput === OWNER_PASS);

    const newUserProfile = {
      uid: user.uid,
      username: usernameInput.trim(),
      email: emailLower,
      password: passwordInput, 
      bio: bioInput.trim() || "صانع مودات شغوف في ماين كرافت!",
      isVerified: isOwner ? true : false,
      isOwner: isOwner,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users_metadata', user.uid), newUserProfile);
      setCurrentUserProfile(newUserProfile);
      localStorage.setItem(`mc_user_${appId}`, JSON.stringify(newUserProfile));
      setShowAuthModal(false);
      resetAuthForm();
      showToast(`مرحباً بك ${newUserProfile.username}! تم إنشاء الحساب بنجاح.`, "success");
      playLevelUpSound();
    } catch (err) {
      console.error("Error saving user profile:", err);
      showToast("حدث خطأ أثناء حفظ الملف الشخصي.", "error");
    }
  };

  // تسجيل الدخول والتحقق من حساب الأونر واللاعبين
  const handleLogin = (e) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      showToast("يرجى ملء البريد والباسورد!", "error");
      return;
    }

    const emailLower = emailInput.trim().toLowerCase();
    const matchedUser = usersList.find(u => u.email.toLowerCase() === emailLower && u.password === passwordInput);

    if (matchedUser) {
      setCurrentUserProfile(matchedUser);
      localStorage.setItem(`mc_user_${appId}`, JSON.stringify(matchedUser));
      setShowAuthModal(false);
      resetAuthForm();
      showToast(`أهلاً بعودتك، ${matchedUser.username}!`, "success");
      playLevelUpSound();
    } else {
      if (emailLower === OWNER_EMAIL.toLowerCase() && passwordInput === OWNER_PASS) {
        // إنشاء حساب الأونر تلقائياً إذا كان يسجل لأول مرة في النظام
        const ownerProfile = {
          uid: user.uid,
          username: "الـمـالـك (Owner)",
          email: OWNER_EMAIL.toLowerCase(),
          password: OWNER_PASS,
          bio: "المدير العام والمسؤول عن فحص وتأكيد المودات لمنع المحتوى الضار.",
          isVerified: true,
          isOwner: true,
          createdAt: new Date().toISOString()
        };
        setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users_metadata', user.uid), ownerProfile)
          .then(() => {
            setCurrentUserProfile(ownerProfile);
            localStorage.setItem(`mc_user_${appId}`, JSON.stringify(ownerProfile));
            setShowAuthModal(false);
            resetAuthForm();
            showToast("أهلاً بك يا مالك الموقع! تم تفعيل صلاحيات الإدارة الكاملة.", "success");
            playLevelUpSound();
          });
      } else {
        showToast("بيانات الدخول غير صحيحة!", "error");
      }
    }
  };

  const handleLogout = () => {
    setCurrentUserProfile(null);
    localStorage.removeItem(`mc_user_${appId}`);
    setCurrentPage('home');
    showToast("تم تسجيل الخروج بنجاح.", "info");
  };

  const resetAuthForm = () => {
    setEmailInput('');
    setPasswordInput('');
    setUsernameInput('');
    setBioInput('');
  };

  // رفع مود جديد (يذهب للمراجعة تلقائياً إلا إذا كان المرفوع من الأونر)
  const handleAddMod = async (e) => {
    e.preventDefault();
    if (!currentUserProfile) {
      showToast("يجب عليك تسجيل الدخول أولاً لرفع المودات!", "error");
      return;
    }

    if (!modTitle || !modDescription || !modDownloadUrl) {
      showToast("يرجى إكمال الحقول الأساسية (الاسم، الوصف، رابط التحميل)!", "error");
      return;
    }

    const defaultImages = {
      mods: "https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&q=80&w=400",
      resourcepacks: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=400",
      modpacks: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=400",
      datapacks: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=400"
    };

    const finalImage = modImageUrl.trim() || defaultImages[modCategory];
    const isOwnerSubmission = currentUserProfile.isOwner;

    const newMod = {
      title: modTitle.trim(),
      description: modDescription.trim(),
      category: modCategory,
      downloadUrl: modDownloadUrl.trim(),
      imageUrl: finalImage,
      creatorId: currentUserProfile.uid,
      creatorName: currentUserProfile.username,
      creatorEmail: currentUserProfile.email,
      creatorBio: modCreatorBio.trim() || currentUserProfile.bio || "",
      status: isOwnerSubmission ? 'approved' : 'pending',
      diamonds: [], 
      isOwnerMod: isOwnerSubmission,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'mods'), newMod);
      setModTitle('');
      setModDescription('');
      setModDownloadUrl('');
      setModImageUrl('');
      setModCreatorBio('');
      
      if (isOwnerSubmission) {
        showToast("تم نشر المود الخاص بك بنجاح للجميع!", "success");
      } else {
        showToast("تم إرسال المود للمراجعة بنجاح! سينتظر موافقة الأونر لضمان خلوه من الأكواد الضارة أو السرقة.", "info");
      }
      playLevelUpSound();
    } catch (err) {
      console.error("Error submitting mod:", err);
      showToast("فشل رفع المود، حاول مجدداً.", "error");
    }
  };

  // الموافقة على المود ونشره للعامة بواسطة المالك
  const approveMod = async (modId) => {
    if (!currentUserProfile || !currentUserProfile.isOwner) return;
    try {
      const modRef = doc(db, 'artifacts', appId, 'public', 'data', 'mods', modId);
      await updateDoc(modRef, { status: 'approved' });
      showToast("تمت الموافقة على المود بنجاح ونشره للجميع على الصفحة الرئيسية!", "success");
      playLevelUpSound();
    } catch (err) {
      console.error("Approve error:", err);
      showToast("فشلت الموافقة على المود.", "error");
    }
  };

  // حذف المود
  const deleteMod = async (modId) => {
    if (!currentUserProfile) return;
    const targetMod = mods.find(m => m.id === modId);
    const isCreator = targetMod && targetMod.creatorId === currentUserProfile.uid;
    const isOwner = currentUserProfile.isOwner;

    if (!isCreator && !isOwner) {
      showToast("ليس لديك صلاحية حذف هذا المود!", "error");
      return;
    }

    try {
      const modRef = doc(db, 'artifacts', appId, 'public', 'data', 'mods', modId);
      await deleteDoc(modRef);
      if (selectedMod && selectedMod.id === modId) {
        setSelectedMod(null);
      }
      showToast("تم حذف المود بنجاح.", "info");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("فشل حذف المود.", "error");
    }
  };

  // منح وإلغاء توثيق صانع محتوى بنجمة الوذر
  const toggleUserVerification = async (targetUserUid, currentStatus) => {
    if (!currentUserProfile || !currentUserProfile.isOwner) {
      showToast("أنت لست الأونر لمنح التوثيق!", "error");
      return;
    }
    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users_metadata', targetUserUid);
      await updateDoc(userRef, { isVerified: !currentStatus });
      showToast(currentStatus ? "تم إلغاء التوثيق عن الصانع" : "تم توثيق الصانع بنجاح بنجمة الوذر بوس! 🌟", "success");
      playLevelUpSound();
    } catch (err) {
      console.error("Verification error:", err);
      showToast("فشل تعديل حالة التوثيق.", "error");
    }
  };

  // إضافة لايك للمود (دايموندة)
  const toggleDiamond = async (modId) => {
    if (!currentUserProfile) {
      showToast("يجب عليك تسجيل الدخول لتمنح المود دايموندة! 💎", "error");
      setShowAuthModal(true);
      return;
    }

    const mod = mods.find(m => m.id === modId);
    if (!mod) return;

    let updatedDiamonds = [...(mod.diamonds || [])];
    const userEmail = currentUserProfile.email;
    const index = updatedDiamonds.indexOf(userEmail);

    if (index > -1) {
      updatedDiamonds.splice(index, 1);
    } else {
      updatedDiamonds.push(userEmail);
      playLevelUpSound(); 
    }

    try {
      const modRef = doc(db, 'artifacts', appId, 'public', 'data', 'mods', modId);
      await updateDoc(modRef, { diamonds: updatedDiamonds });
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  // إضافة تعليق للمود
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!currentUserProfile) {
      showToast("سجل دخولك أولاً لإضافة تعليق!", "error");
      setShowAuthModal(true);
      return;
    }

    if (!newCommentText.trim()) return;

    const commentData = {
      modId: selectedMod.id,
      userId: currentUserProfile.uid,
      username: currentUserProfile.username,
      isVerified: currentUserProfile.isVerified || false,
      isOwner: currentUserProfile.isOwner || false,
      text: newCommentText.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'comments'), commentData);
      setNewCommentText('');
      showToast("تمت إضافة تعليقك!", "success");
    } catch (err) {
      console.error("Comment error:", err);
      showToast("فشل إرسال التعليق.", "error");
    }
  };

  const deleteComment = async (commentId) => {
    if (!currentUserProfile) return;
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const isCommentCreator = comment.userId === currentUserProfile.uid;
    const isOwner = currentUserProfile.isOwner;

    if (!isCommentCreator && !isOwner) return;

    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'comments', commentId));
      showToast("تم حذف التعليق.", "info");
    } catch (err) {
      console.error("Delete comment error:", err);
    }
  };

  // تصفية وعرض المودات المعتمدة فقط على الصفحة الرئيسية
  const getFilteredMods = () => {
    // الصفحة الرئيسية تعرض المودات المقبولة والمعتمدة للجميع فقط!
    let list = mods.filter(m => m.status === 'approved');

    if (activeTab === 'owner_mods') {
      list = list.filter(m => m.isOwnerMod === true || m.creatorEmail === OWNER_EMAIL.toLowerCase());
    } else if (activeTab !== 'all') {
      list = list.filter(m => m.category === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m => 
        m.title.toLowerCase().includes(q) || 
        m.description.toLowerCase().includes(q) ||
        m.creatorName.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const getPendingModsCount = () => {
    return mods.filter(m => m.status === 'pending').length;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-slate-950" dir="rtl">
      
      {/* المؤثرات البصرية الخلفية */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-emerald-950/20 via-slate-950/0 to-transparent pointer-events-none" />

      {/* التنبيهات المنبثقة */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className={`px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3 space-x-reverse border border-slate-700/50 ${
            notification.type === 'error' ? 'bg-red-900/90 text-red-200' :
            notification.type === 'info' ? 'bg-blue-900/90 text-blue-200' : 'bg-emerald-900/90 text-emerald-200'
          }`}>
            <Sparkles className="w-5 h-5 text-yellow-400 shrink-0" />
            <span className="font-semibold text-sm mr-2">{notification.message}</span>
          </div>
        </div>
      )}

      {/* الهيدر والقائمة العلوية مع زر الانتقال بين الصفحات */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* الشعار */}
          <div className="flex items-center space-x-3 space-x-reverse cursor-pointer shrink-0" onClick={() => { setCurrentPage('home'); setSelectedMod(null); }}>
            <div className="bg-gradient-to-tr from-emerald-600 to-cyan-500 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20 ml-3">
              <svg className="w-6 h-6 text-slate-950" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 2v14h14V5H5zm2 2h4v4H7V7zm6 0h4v2h-4V7zm0 4h4v4H-4v-4zm0 4h4v4h-4v-4zM7 13h4v4H7v-4z" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">
                مـايـن كـرافـت بـورتـال
              </h1>
              <span className="text-xs text-slate-400 block font-semibold leading-none">مستودع المودات والملحقات العربي</span>
            </div>
          </div>

          {/* نظام الصفحات الرئيسي في الهيدر */}
          <div className="flex items-center space-x-2 space-x-reverse mx-2">
            <button 
              onClick={() => { setCurrentPage('home'); setSelectedMod(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentPage === 'home' 
                  ? 'bg-gradient-to-r from-emerald-600 to-cyan-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span>الرئيسية 🏠</span>
            </button>
            <button 
              onClick={() => {
                if (!currentUserProfile) {
                  showToast("يرجى تسجيل الدخول أولاً للرفع والمتابعة!", "error");
                  setShowAuthModal(true);
                } else {
                  setCurrentPage('upload_page');
                  setSelectedMod(null);
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 relative ${
                currentPage === 'upload_page' 
                  ? 'bg-gradient-to-r from-emerald-600 to-cyan-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20' 
                  : 'text-slate-300 hover:bg-slate-800 border border-slate-800/60 bg-slate-900/40'
              }`}
            >
              <span>صفحة الرفع والمتابعة 📥</span>
              {currentUserProfile && currentUserProfile.isOwner && getPendingModsCount() > 0 && (
                <span className="absolute -top-1.5 -left-1.5 bg-red-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                  {getPendingModsCount()}
                </span>
              )}
            </button>
          </div>

          {/* معلومات المستخدم وأزرار التحكم */}
          <div className="flex items-center space-x-3 space-x-reverse">
            {currentUserProfile ? (
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="hidden lg:flex flex-col text-left space-y-0.5 align-middle ml-3">
                  <div className="flex items-center space-x-1.5 space-x-reverse justify-end">
                    <span className="font-bold text-slate-200 text-sm">{currentUserProfile.username}</span>
                    
                    {/* نجمة الوذر للموثقين */}
                    {currentUserProfile.isVerified && (
                      <span className="text-purple-400 mr-1" title="صانع موثق (نجمة الوذر)">
                        <svg className="w-4.5 h-4.5 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)] fill-current inline-block" viewBox="0 0 24 24">
                          <path d="M12 2l2.4 5.3 5.3 2.4-5.3 2.4-2.4 5.3-2.4-5.3-5.3-2.4 5.3-2.4z" />
                          <circle cx="12" cy="12" r="2" className="text-white" />
                        </svg>
                      </span>
                    )}

                    {currentUserProfile.isOwner && (
                      <span className="text-amber-400 bg-amber-950/80 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 font-bold mr-1">الأونر</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 max-w-[120px] truncate block text-right">{currentUserProfile.email}</span>
                </div>

                <button 
                  onClick={handleLogout}
                  className="bg-slate-800 hover:bg-slate-700 hover:text-red-400 text-slate-300 p-2.5 rounded-xl transition-all"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <LogIn className="w-4 h-4 ml-1" />
                <span>الدخول / التسجيل</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* محتوى الصفحة الرئيسي */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* الصفحة الأولى: الصفحة الرئيسية للجميع (تُظهر المودات المعتمدة فقط) */}
        {currentPage === 'home' && (
          <div className="space-y-8 animate-fade-in">
            {/* البانر الترحيبي والتعليمات */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 rounded-2xl p-6 border border-emerald-800/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Layers className="w-48 h-48" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1 bg-emerald-950 border border-emerald-700/40 text-emerald-400 text-[11px] px-2.5 py-1 rounded-full font-bold mb-2">
                    <Sparkles className="w-3.5 h-3.5 ml-1" />
                    مستودع آمن وخالٍ من الكوبي بنسبة 100%
                  </span>
                  <h2 className="text-2xl font-black text-slate-100">ابحث وحمّل أفضل مودات وملحقات ماين كرافت!</h2>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    هنا نقوم بفحص وتدقيق كل ملف مرفوع يدوياً بواسطة <strong className="text-emerald-400">الـمـالـك</strong> للتأكد من سلامة جهازك وموثوقية الأكواد. اضغط على زر <strong className="text-emerald-400">"صفحة الرفع والمتابعة"</strong> في الأعلى لتنشر موداتك وتتابع حالة الفحص.
                  </p>
                </div>
                
                {/* إحصائيات سريعة */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center min-w-[80px]">
                    <span className="block text-xl font-bold text-emerald-400">{mods.filter(m => m.status === 'approved').length}</span>
                    <span className="text-[10px] text-slate-400">مود معتمد</span>
                  </div>
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center min-w-[80px]">
                    <span className="block text-xl font-bold text-cyan-400">
                      {mods.reduce((total, m) => total + (m.diamonds ? m.diamonds.length : 0), 0)}
                    </span>
                    <span className="text-[10px] text-slate-400">💎 دايموند</span>
                  </div>
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center min-w-[80px]">
                    <span className="block text-xl font-bold text-purple-400">
                      {usersList.filter(u => u.isVerified).length}
                    </span>
                    <span className="text-[10px] text-slate-400">صانع موثق</span>
                  </div>
                </div>
              </div>
            </div>

            {/* أشرطة تصفية الأقسام والبحث على الصفحة الرئيسية */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
              
              {/* الأقسام */}
              <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800/80 w-full md:w-auto overflow-x-auto no-scrollbar scroll-smooth">
                <button 
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'all'
                      ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-slate-950 font-bold' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  الكل
                </button>
                <button 
                  onClick={() => setActiveTab('mods')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'mods'
                      ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-slate-950 font-bold' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  المودات
                </button>
                <button 
                  onClick={() => setActiveTab('resourcepacks')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'resourcepacks'
                      ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-slate-950 font-bold' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ريسورس باك
                </button>
                <button 
                  onClick={() => setActiveTab('modpacks')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'modpacks'
                      ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-slate-950 font-bold' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  مود باكات
                </button>
                <button 
                  onClick={() => setActiveTab('datapacks')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'datapacks'
                      ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-slate-950 font-bold' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  داتاباك
                </button>
                
                <button 
                  onClick={() => setActiveTab('owner_mods')}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                    activeTab === 'owner_mods'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' 
                      : 'text-amber-400 border-amber-950/40 bg-amber-950/20 hover:bg-amber-950/40'
                  }`}
                >
                  👑 مودات الأونر الخاصة بي
                </button>
              </div>

              {/* مربع البحث */}
              <div className="relative w-full md:w-80">
                <input 
                  type="text"
                  placeholder="ابحث عن مود، ريسورس باك..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-4 py-2.5 pl-10 pr-4 rounded-xl text-xs focus:outline-none focus:border-emerald-500/50"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>

            </div>

            {/* عرض شبكة المودات المصفاة والمقبولة فقط */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredMods().length === 0 ? (
                <div className="col-span-full py-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80">
                  <Compass className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-sm font-semibold mb-2">لم نجد أي مودات معتمدة ومقبولة حالياً</p>
                  <p className="text-slate-500 text-xs">هل قمت برفع مود جديد؟ توجه لصفحة الرفع لمتابعة حالته والانتظار حتى يوافق الأونر!</p>
                </div>
              ) : (
                getFilteredMods().map((mod) => {
                  const isVerifiedCreator = usersList.find(u => u.uid === mod.creatorId)?.isVerified || mod.creatorEmail === OWNER_EMAIL.toLowerCase();
                  const isLiked = currentUserProfile && mod.diamonds?.includes(currentUserProfile.email);
                  
                  return (
                    <div 
                      key={mod.id}
                      className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden hover:border-emerald-500/20 hover:-translate-y-1 transition-all duration-300 flex flex-col h-[400px] shadow-lg relative group animate-fade-in"
                    >
                      
                      {/* شارة نوع الملف */}
                      <span className="absolute top-3 right-3 z-10 bg-slate-950/85 backdrop-blur-md text-slate-300 text-[10px] px-3 py-1 rounded-full border border-slate-800 font-bold">
                        {mod.category === 'mods' ? '⚙️ مود' : 
                         mod.category === 'resourcepacks' ? '🎨 ريسورس باك' : 
                         mod.category === 'modpacks' ? '📦 مود باك' : '📜 داتاباك'}
                      </span>

                      {mod.isOwnerMod && (
                        <span className="absolute top-3 left-3 z-10 bg-amber-500 text-slate-950 text-[10px] px-2.5 py-1 rounded-full font-black shadow-md shadow-amber-500/20">
                          👑 رسمي للأونر
                        </span>
                      )}

                      {/* صورة المود */}
                      <div className="relative h-44 overflow-hidden shrink-0 bg-slate-950">
                        <img 
                          src={mod.imageUrl} 
                          alt={mod.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 opacity-80"
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&q=80&w=400";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                      </div>

                      {/* معلومات المود */}
                      <div className="p-5 flex flex-col justify-between flex-grow">
                        <div>
                          <div className="flex items-center space-x-1.5 space-x-reverse mb-2">
                            <span className="text-[11px] text-slate-400">بواسطة:</span>
                            <span className="text-[11px] font-bold text-slate-300 truncate max-w-[120px] ml-1" title={mod.creatorName}>
                              {mod.creatorName}
                            </span>
                            
                            {isVerifiedCreator && (
                              <span className="text-purple-400" title="صانع موثق">
                                <svg className="w-3.5 h-3.5 fill-current inline-block" viewBox="0 0 24 24">
                                  <path d="M12 2l2.4 5.3 5.3 2.4-5.3 2.4-2.4 5.3-2.4-5.3-5.3-2.4 5.3-2.4z" />
                                  <circle cx="12" cy="12" r="2" className="text-white" />
                                </svg>
                              </span>
                            )}
                          </div>

                          <h4 className="text-base font-bold text-slate-100 mb-2 truncate group-hover:text-emerald-400 transition-colors">
                            {mod.title}
                          </h4>
                          
                          <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed h-12">
                            {mod.description}
                          </p>
                        </div>

                        {/* التفاعل السفلي */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 shrink-0">
                          
                          {/* زر الدايموندة */}
                          <button 
                            onClick={() => toggleDiamond(mod.id)}
                            className={`flex items-center space-x-1.5 space-x-reverse px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              isLiked 
                                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.15)]' 
                                : 'bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-700/50'
                            }`}
                          >
                            <span className="text-sm ml-1">💎</span>
                            <span>{mod.diamonds ? mod.diamonds.length : 0}</span>
                          </button>

                          {/* إجراءات المود */}
                          <div className="flex gap-2">
                            {currentUserProfile && (currentUserProfile.isOwner || mod.creatorId === currentUserProfile.uid) && (
                              <button 
                                onClick={() => deleteMod(mod.id)}
                                className="p-2 bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 rounded-lg transition-all ml-1"
                                title="حذف هذا المود"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            
                            <button 
                              onClick={() => setSelectedMod(mod)}
                              className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-slate-950 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                            >
                              <span>عرض وتنزيل</span>
                              <Eye className="w-3.5 h-3.5 mr-1" />
                            </button>
                          </div>

                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* الصفحة الثانية: صفحة الرفع والمتابعة الخاصة بالناشر والأونر */}
        {currentPage === 'upload_page' && currentUserProfile && (
          <div className="space-y-8 animate-fade-in">
            <div className="border-b border-slate-800 pb-4 mb-6">
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">
                مستودع رفع الملفات ومتابعة الفحص
              </h2>
              <p className="text-xs text-slate-400 mt-1">هنا يظهر نموذج رفع ملفاتك، ولا يظهر محتوى المود المعلق إلا لك وللأونر فقط حتى تتم الموافقة الأمنية عليه.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* القسم الأيمن: استمارة ونموذج الرفع المباشر للمودات والملحقات */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800/80 p-6 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center space-x-2 space-x-reverse border-b border-slate-800/60 pb-3">
                  <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 ml-2">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-200">رفع مود جديد للنظام</h3>
                    <p className="text-[10px] text-slate-400">يرجى استكمال الحقول لإرساله للمراجع العام.</p>
                  </div>
                </div>

                <form onSubmit={handleAddMod} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المود / الملف *</label>
                    <input 
                      type="text"
                      required
                      placeholder="مثال: مود الخرائط الواقعية، ريسورس باك السيوف"
                      value={modTitle}
                      onChange={(e) => setModTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">القسم *</label>
                      <select 
                        value={modCategory}
                        onChange={(e) => setModCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none"
                      >
                        <option value="mods">⚙️ مودات</option>
                        <option value="resourcepacks">🎨 ريسورس باك</option>
                        <option value="modpacks">📦 مود باكات</option>
                        <option value="datapacks">📜 داتاباك</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">رابط صورة المعاينة (اختياري)</label>
                      <input 
                        type="url"
                        placeholder="أدخل رابط صورة المود"
                        value={modImageUrl}
                        onChange={(e) => setModImageUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">رابط تحميل المود المباشر *</label>
                    <input 
                      type="url"
                      required
                      placeholder="Mediafire, Google Drive, Mega, Dropbox..."
                      value={modDownloadUrl}
                      onChange={(e) => setModDownloadUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">وصف المود وتفاصيله بالتفصيل *</label>
                    <textarea 
                      required
                      rows="3"
                      placeholder="اشرح للاعبين ماذا يفعل هذا المود وكيفية تثبيته والنسخ المتوافقة..."
                      value={modDescription}
                      onChange={(e) => setModDescription(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">نبذة عنك كصانع مودات (اختياري)</label>
                    <input 
                      type="text"
                      placeholder="مثال: مطور جافا متخصص بمودات الإكس بي التلقائية"
                      value={modCreatorBio}
                      onChange={(e) => setModCreatorBio(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 text-slate-950 py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1"
                  >
                    <PlusCircle className="w-4.5 h-4.5 ml-1" />
                    <span>إرسال الملف وفحصه</span>
                  </button>
                </form>
              </div>

              {/* القسم الأيسر: قائمة تتبع المودات المرسلة وحالتها الأمنية */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. قائمة التتبع الخاصة بالناشر نفسه */}
                <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-purple-400" />
                      <h3 className="font-bold text-sm text-slate-200">صندوق المتابعة والمودات المرسلة لك</h3>
                    </div>
                    <span className="bg-purple-950/80 text-purple-300 text-[10px] px-2.5 py-0.5 rounded-full border border-purple-500/20 font-bold">
                      {mods.filter(m => m.creatorId === currentUserProfile.uid).length} ملف مرسل
                    </span>
                  </div>

                  {mods.filter(m => m.creatorId === currentUserProfile.uid).length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-10">لم تقم بإرسال أو رفع أي ملفات حتى الآن. استخدم الاستمارة لرفع أول ملف!</p>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {mods.filter(m => m.creatorId === currentUserProfile.uid).map(mod => (
                        <div key={mod.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="bg-slate-900 text-slate-300 text-[9px] px-2 py-0.5 rounded border border-slate-800 font-semibold">
                                  {mod.category === 'mods' ? '⚙️ مود' : 
                                   mod.category === 'resourcepacks' ? '🎨 ريسورس باك' : 
                                   mod.category === 'modpacks' ? '📦 مود باك' : '📜 داتاباك'}
                                </span>
                                {mod.status === 'pending' ? (
                                  <span className="bg-yellow-950 text-yellow-400 border border-yellow-500/20 text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse font-bold">
                                    <Clock className="w-3 h-3" />
                                    تحت المراجعة والتحقق الأمني (مخفي عن الجميع)
                                  </span>
                                ) : (
                                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                    <CheckCircle className="w-3 h-3" />
                                    تم القبول والاعتماد في القائمة الرئيسية للجميع!
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-slate-100 text-sm">{mod.title}</h4>
                              <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">{mod.description}</p>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              <button 
                                onClick={() => setSelectedMod(mod)}
                                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 p-2 rounded-lg transition-all"
                                title="معاينة الملف"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => deleteMod(mod.id)}
                                className="bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-500/20 p-2 rounded-lg transition-all"
                                title="حذف الملف نهائياً"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. لوحة تحكم الأونر الحصرية لمراجعة كافة الطلبات المعلقة */}
                {currentUserProfile.isOwner && (
                  <div className="bg-slate-900 border border-amber-500/30 p-6 rounded-2xl shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
                      <div className="flex items-center gap-2 text-amber-400">
                        <Shield className="w-5 h-5" />
                        <h3 className="font-bold text-sm">لوحة الأونر: المراجعة والموافقة العامة</h3>
                      </div>
                      <span className="bg-amber-950 text-amber-300 border border-amber-600/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                        {getPendingModsCount()} طلب معلق
                      </span>
                    </div>

                    {getPendingModsCount() === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-8">لا توجد أي مودات معلقة بالانتظار حالياً!</p>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {mods.filter(m => m.status === 'pending').map(mod => (
                          <div key={mod.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-amber-500/20 transition-all flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-semibold">
                                  {mod.category === 'mods' ? 'مودات' : 
                                   mod.category === 'resourcepacks' ? 'ريسورس باك' : 
                                   mod.category === 'modpacks' ? 'مود باكات' : 'داتاباك'}
                                </span>
                                <span className="text-[10px] text-slate-500">من: {mod.creatorName}</span>
                              </div>
                              
                              <h5 className="font-bold text-slate-100 text-sm mb-1">{mod.title}</h5>
                              <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">{mod.description}</p>
                              
                              <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 mb-4 text-[10px] space-y-0.5">
                                <p className="text-slate-300 font-semibold">بريد الناشر: {mod.creatorEmail}</p>
                                <p className="text-slate-400">نبذة الصانع: {mod.creatorBio || "لا توجد نبذة"}</p>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button 
                                onClick={() => approveMod(mod.id)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                              >
                                <CheckCircle className="w-3.5 h-3.5 ml-1" />
                                <span>الموافقة والنشر للجميع</span>
                              </button>
                              
                              <a 
                                href={mod.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-950 hover:bg-blue-900 text-blue-300 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center"
                                title="تحميل لفحص الملف"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>

                              <button 
                                onClick={() => deleteMod(mod.id)}
                                className="bg-red-950 hover:bg-red-900 text-red-300 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center"
                                title="رفض وحذف الملف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>

            </div>
          </div>
        )}

      </main>

      {/* تفاصيل المود والتعليقات والتحميل */}
      {selectedMod && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl relative my-8 animate-scale-up max-h-[90vh] flex flex-col">
            
            {/* ترويسة تفاصيل المود */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className="bg-slate-800 text-emerald-400 text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ml-2">
                  {selectedMod.category}
                </span>
                <h3 className="text-lg font-black text-slate-100">{selectedMod.title}</h3>
                {selectedMod.status === 'pending' && (
                  <span className="bg-yellow-950 text-yellow-400 border border-yellow-500/20 text-[10px] px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                    ⏳ تحت الفحص والمراجعة
                  </span>
                )}
              </div>
              <button 
                onClick={() => setSelectedMod(null)}
                className="text-slate-400 hover:text-slate-200 text-xs bg-slate-800 px-3 py-1.5 rounded-lg font-bold"
              >
                إغلاق
              </button>
            </div>

            {/* تفاصيل قابلة للتمرير */}
            <div className="overflow-y-auto p-6 space-y-6 flex-grow">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="md:col-span-1 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 h-44">
                  <img 
                    src={selectedMod.imageUrl} 
                    alt={selectedMod.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&q=80&w=400";
                    }}
                  />
                </div>

                <div className="md:col-span-2 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 space-x-reverse mb-1">
                      <span className="text-xs text-slate-400">تاريخ النشر:</span>
                      <span className="text-xs text-slate-300 font-bold">{new Date(selectedMod.createdAt).toLocaleDateString('ar-EG')}</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed max-h-32 overflow-y-auto pr-2">
                      {selectedMod.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800/80">
                    <a 
                      href={selectedMod.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/15"
                    >
                      <Download className="w-4.5 h-4.5 ml-1" />
                      <span>تحميل المود / الملحق</span>
                    </a>

                    <button 
                      onClick={() => toggleDiamond(selectedMod.id)}
                      className={`flex items-center space-x-2 space-x-reverse px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        currentUserProfile && selectedMod.diamonds?.includes(currentUserProfile.email)
                          ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30' 
                          : 'bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-700/50'
                      }`}
                    >
                      <span className="ml-1">💎 اهدِ دايموندة</span>
                      <span className="bg-slate-950/60 px-2 py-0.5 rounded text-[11px]">{selectedMod.diamonds ? selectedMod.diamonds.length : 0}</span>
                    </button>
                  </div>

                </div>

              </div>

              {/* بطاقة صانع المحتوى */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-emerald-400 shrink-0 ml-2">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className="font-bold text-slate-200 text-xs">منشئ المود: {selectedMod.creatorName}</span>
                      
                      {(usersList.find(u => u.uid === selectedMod.creatorId)?.isVerified || selectedMod.creatorEmail === OWNER_EMAIL.toLowerCase()) && (
                        <span className="text-purple-400 mr-2 inline-flex items-center gap-1 text-[10px] bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-full" title="صانع موثق">
                          <svg className="w-3 h-3 fill-current text-purple-400 shrink-0" viewBox="0 0 24 24">
                            <path d="M12 2l2.4 5.3 5.3 2.4-5.3 2.4-2.4 5.3-2.4-5.3-5.3-2.4 5.3-2.4z" />
                            <circle cx="12" cy="12" r="2" className="text-white" />
                          </svg>
                          <span>موثق بنجمة النذر</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{selectedMod.creatorBio || "صانع مودات ماين كرافت نشيط ومبتكر."}</p>
                  </div>
                </div>
              </div>

              {/* قسم التعليقات والمناقشات */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400 ml-1" />
                  <span>التعليقات والمناقشات</span>
                  <span className="text-xs text-slate-500 mr-1">({comments.filter(c => c.modId === selectedMod.id).length})</span>
                </h4>

                {/* نموذج كتابة تعليق */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="اكتب تعليقك هنا أو اسأل عن توافق المود..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-grow bg-slate-950 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500/50"
                  />
                  <button 
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    إرسال
                  </button>
                </form>

                {/* قائمة التعليقات السابقة */}
                <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
                  {comments.filter(c => c.modId === selectedMod.id).length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">لا توجد تعليقات بعد. كن أول من يكتب تعليقاً لطيفاً!</p>
                  ) : (
                    comments
                      .filter(c => c.modId === selectedMod.id)
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                      .map((comment) => {
                        const isVerifiedCommenter = usersList.find(u => u.uid === comment.userId)?.isVerified || comment.isOwner;
                        const isCommentOwner = comment.isOwner;
                        
                        return (
                          <div key={comment.id} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2 space-x-reverse">
                                <span className={`text-xs font-bold ml-1 ${isCommentOwner ? 'text-amber-400' : 'text-slate-300'}`}>
                                  {comment.username}
                                </span>
                                
                                {isVerifiedCommenter && (
                                  <span className="text-purple-400 shrink-0 ml-1" title="موثق">
                                    <svg className="w-3 h-3 fill-current inline-block" viewBox="0 0 24 24">
                                      <path d="M12 2l2.4 5.3 5.3 2.4-5.3 2.4-2.4 5.3-2.4-5.3-5.3-2.4 5.3-2.4z" />
                                      <circle cx="12" cy="12" r="2" className="text-white" />
                                    </svg>
                                  </span>
                                )}

                                {isCommentOwner && (
                                  <span className="text-[9px] bg-amber-950/80 text-amber-300 border border-amber-600/30 px-1.5 py-0.5 rounded-md font-bold ml-1">الأونر</span>
                                )}

                                <span className="text-[10px] text-slate-500">
                                  {new Date(comment.createdAt).toLocaleDateString('ar-EG')}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300">{comment.text}</p>
                            </div>

                            {currentUserProfile && (currentUserProfile.isOwner || comment.userId === currentUserProfile.uid) && (
                              <button 
                                onClick={() => deleteComment(comment.id)}
                                className="text-slate-500 hover:text-red-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* نافذة تسجيل الدخول أو إنشاء الحساب */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl p-6 shadow-2xl relative animate-scale-up">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-black text-slate-100">
                {authMode === 'login' ? 'سجل دخولك الآن' : 'انضم إلينا كصانع مودات'}
              </h3>
              <button 
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                إغلاق
              </button>
            </div>

            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
              
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المستخدم (الاسم المعروض)</label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: CreeperSlayer"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">البريد الإلكتروني</label>
                <input 
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">كلمة المرور (الباسورد)</label>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">نبذة سريعة عنك (اختياري)</label>
                  <input 
                    type="text"
                    placeholder="مثال: أصنع مودات ريدستون متقدمة"
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3.5 py-2 rounded-xl text-xs focus:outline-none"
                  />
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <span>{authMode === 'login' ? 'دخول' : 'إنشاء حساب جديد'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-xs text-slate-400 hover:text-emerald-400 font-semibold transition-colors"
                >
                  {authMode === 'login' ? 'ليس لديك حساب؟ سجل كعضو جديد' : 'لديك حساب بالفعل؟ سجل دخولك'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* تذييل الصفحة */}
      <footer className="bg-slate-950 border-t border-slate-900 py-10 text-center text-xs text-slate-500 mt-20">
        <div className="max-w-7xl mx-auto px-4">
          <p className="mb-2">كل الحقوق محفوظة © مـايـن كـرافـت بـورتـال 2026</p>
          <p className="text-[10px] text-slate-600">هذا الموقع ليس منتجاً رسمياً من Mojang أو Microsoft وغير مرتبط بأي منهما.</p>
        </div>
      </footer>

    </div>
  );
}