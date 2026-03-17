import React, { useState, useEffect, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  collection, 
  query, 
  orderBy, 
  addDoc,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { 
  Leaf, 
  Car, 
  Zap, 
  Utensils, 
  BarChart3, 
  MessageSquare, 
  Trophy, 
  Plus, 
  LogOut, 
  TrendingDown,
  Calendar,
  ChevronRight,
  Award,
  Flame,
  Cloud,
  MapPin,
  User as UserIcon
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { format, subDays, startOfDay, isSameDay, parseISO } from 'date-fns';
import { auth, db, signIn, logOut } from './firebase';
import { UserProfile, EmissionEntry, EmissionCategory } from './types';
import { TRAVEL_FACTORS, ELECTRICITY_FACTOR, FOOD_FACTORS, BADGES } from './constants';
import { getSustainabilityAdvice, chatWithAssistant, getWeatherData } from './services/geminiService';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("glass rounded-2xl p-6", className)}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  disabled
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost',
  className?: string,
  disabled?: boolean
}) => {
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    secondary: "bg-stone-800 text-white hover:bg-stone-900 shadow-sm",
    outline: "border border-stone-200 hover:bg-stone-50 text-stone-700",
    ghost: "hover:bg-stone-100 text-stone-600"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Input = ({ label, type = "text", value, onChange, placeholder, min }: any) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-medium text-stone-600 ml-1">{label}</label>}
    <input 
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
    />
  </div>
);

const Select = ({ label, options, value, onChange }: any) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-medium text-stone-600 ml-1">{label}</label>}
    <select 
      value={value}
      onChange={onChange}
      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white"
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [emissions, setEmissions] = useState<EmissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'log' | 'reports' | 'ai'>('dashboard');
  const [aiAdvice, setAiAdvice] = useState<string>("");

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setEmissions([]);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Profile & Emissions Listener
  useEffect(() => {
    if (!user) return;

    const profileRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        // Initialize profile
        const newProfile: UserProfile = {
          uid: user.uid,
          displayName: user.displayName || 'Eco Warrior',
          email: user.email || '',
          photoURL: user.photoURL || '',
          totalPoints: 0,
          currentStreak: 0,
          lastActiveDate: format(new Date(), 'yyyy-MM-dd'),
          badges: []
        };
        setDoc(profileRef, newProfile);
      }
    });

    const emissionsRef = collection(db, 'users', user.uid, 'emissions');
    const q = query(emissionsRef, orderBy('date', 'desc'));
    const unsubEmissions = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmissionEntry));
      setEmissions(data);
      setLoading(false);
    });

    return () => {
      unsubProfile();
      unsubEmissions();
    };
  }, [user]);

  // AI Advice Fetcher
  useEffect(() => {
    if (activeTab === 'dashboard' && emissions.length > 0 && !aiAdvice) {
      const recentData = emissions.slice(0, 5).map(e => `${e.category}: ${e.co2Amount}kg`).join(', ');
      getSustainabilityAdvice(recentData).then(setAiAdvice);
    }
  }, [activeTab, emissions]);

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const todayEmissions = emissions.filter(e => isSameDay(e.date.toDate(), today));
    const totalToday = todayEmissions.reduce((acc, curr) => acc + curr.co2Amount, 0);
    
    const categoryTotals = emissions.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.co2Amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalToday,
      categoryTotals,
      totalAllTime: emissions.reduce((acc, curr) => acc + curr.co2Amount, 0),
      points: profile?.totalPoints || 0,
      streak: profile?.currentStreak || 0
    };
  }, [emissions, profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <Leaf className="w-12 h-12 text-emerald-500 animate-bounce" />
          <p className="text-stone-500 font-medium animate-pulse">Loading your green world...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="inline-flex p-4 bg-emerald-100 rounded-3xl">
            <Leaf className="w-12 h-12 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-display font-bold text-stone-900">Sustainable Living</h1>
            <p className="text-stone-500 text-lg">Track your footprint, earn rewards, and save the planet.</p>
          </div>
          <Button onClick={signIn} className="w-full py-4 text-lg">
            Get Started with Google
          </Button>
          <p className="text-xs text-stone-400">By joining, you agree to track your carbon impact for a better future.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-20 lg:pl-64 bg-stone-50">
      {/* Sidebar / Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:w-20 lg:w-64 bg-white border-t md:border-t-0 md:border-r border-stone-200 z-50 flex md:flex-col justify-around md:justify-start p-2 md:p-4 gap-4">
        <div className="hidden md:flex items-center gap-3 px-2 mb-8 mt-2">
          <div className="p-2 bg-emerald-500 rounded-xl">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="hidden lg:block font-display font-bold text-xl text-stone-900">EcoTrack</span>
        </div>

        <NavItem icon={<BarChart3 />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <NavItem icon={<Plus />} label="Log Activity" active={activeTab === 'log'} onClick={() => setActiveTab('log')} />
        <NavItem icon={<TrendingDown />} label="Reports" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        <NavItem icon={<MessageSquare />} label="AI Assistant" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />

        <div className="mt-auto hidden md:block">
          <button onClick={logOut} className="w-full flex items-center gap-3 p-3 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
            <LogOut className="w-6 h-6" />
            <span className="hidden lg:block font-medium">Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-display font-bold text-stone-900">Hello, {profile?.displayName.split(' ')[0]}</h2>
            <p className="text-stone-500">Let's make today a green day.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-full font-bold border border-orange-100">
              <Flame className="w-5 h-5" />
              <span>{stats.streak}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full font-bold border border-emerald-100">
              <Trophy className="w-5 h-5" />
              <span>{stats.points}</span>
            </div>
            <img src={profile?.photoURL} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
          </div>
        </header>

        {activeTab === 'dashboard' && <Dashboard stats={stats} emissions={emissions} aiAdvice={aiAdvice} />}
        {activeTab === 'log' && <LogActivity user={user} profile={profile} />}
        {activeTab === 'reports' && <Reports emissions={emissions} />}
        {activeTab === 'ai' && <AIAssistant emissions={emissions} />}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col md:flex-row items-center gap-1 md:gap-3 p-3 rounded-xl transition-all w-full",
        active ? "bg-emerald-50 text-emerald-600" : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
      )}
    >
      <div className={cn("transition-transform", active && "scale-110")}>{icon}</div>
      <span className="text-[10px] md:text-sm lg:text-base font-medium">{label}</span>
    </button>
  );
}

// --- Sub-Components ---

function Dashboard({ stats, emissions, aiAdvice }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Quick Stats */}
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-emerald-600 text-white border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-950 font-bold">Daily Emissions</p>
              <h3 className="text-4xl font-bold mt-1 text-emerald-950">{stats.totalToday.toFixed(2)} <span className="text-lg font-normal">kg CO₂</span></h3>
            </div>
            <div className="p-3 bg-white/20 rounded-2xl">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-emerald-950 text-sm font-medium">
            <Calendar className="w-4 h-4" />
            <span>Today, {format(new Date(), 'MMM dd')}</span>
          </div>
        </Card>

        <WeatherCard city="Bangalore" />

        <Card className="md:col-span-2 lg:col-span-1">
          <h4 className="font-bold text-stone-900 mb-4">Category Breakdown</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Travel', value: stats.categoryTotals.travel || 0 },
                    { name: 'Electricity', value: stats.categoryTotals.electricity || 0 },
                    { name: 'Food', value: stats.categoryTotals.food || 0 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#3b82f6" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs font-medium mt-2">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Travel</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Electricity</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Food</div>
          </div>
        </Card>

        {/* AI Insight */}
        <Card className="md:col-span-2 bg-emerald-50 text-stone-900 border-emerald-100 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-emerald-700 mb-3">
              <Zap className="w-5 h-5 fill-emerald-700" />
              <span className="font-bold uppercase tracking-wider text-xs">AI Recommendation</span>
            </div>
            <div className="prose prose-stone max-w-none text-stone-900">
              <Markdown>{aiAdvice || "Analyzing your habits to provide personalized tips..."}</Markdown>
            </div>
          </div>
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
        </Card>
      </div>

      {/* Recent Activity & Badges */}
      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-stone-900">Recent Activity</h4>
            <button className="text-emerald-600 text-sm font-bold hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {emissions.slice(0, 4).map((e: any) => (
              <div key={e.id} className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-xl",
                  e.category === 'travel' ? "bg-emerald-50 text-emerald-600" :
                  e.category === 'electricity' ? "bg-amber-50 text-amber-600" :
                  "bg-blue-50 text-blue-600"
                )}>
                  {e.category === 'travel' ? <Car className="w-5 h-5" /> :
                   e.category === 'electricity' ? <Zap className="w-5 h-5" /> :
                   <Utensils className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-900 truncate">
                    {e.category === 'travel' ? e.details.mode : 
                     e.category === 'food' ? e.details.foodItem : 'Electricity'}
                  </p>
                  <p className="text-xs text-stone-500">{format(e.date.toDate(), 'MMM dd, h:mm a')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-stone-900">{e.co2Amount.toFixed(1)}kg</p>
                  <p className="text-[10px] text-emerald-600 font-bold">+{e.pointsEarned} pts</p>
                </div>
              </div>
            ))}
            {emissions.length === 0 && (
              <p className="text-sm text-stone-400 text-center py-4">No activities logged yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <h4 className="font-bold text-stone-900 mb-4">Badges Earned</h4>
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-square rounded-xl bg-stone-100 flex items-center justify-center text-stone-300">
                <Award className="w-6 h-6" />
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-400 mt-4 text-center">Keep logging to unlock more!</p>
        </Card>
      </div>
    </div>
  );
}

function LogActivity({ user, profile }: any) {
  const [category, setCategory] = useState<EmissionCategory>('travel');
  const [loading, setLoading] = useState(false);
  
  // Travel state
  const [distance, setDistance] = useState('');
  const [mode, setMode] = useState('car');
  
  // Electricity state
  const [consumption, setConsumption] = useState('');
  
  // Food state
  const [foodItem, setFoodItem] = useState('beef');
  const [servings, setServings] = useState('1');

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    let co2Amount = 0;
    let details: any = {};
    let value = 0;
    let unit = '';

    if (category === 'travel') {
      const factor = TRAVEL_FACTORS[mode];
      value = parseFloat(distance);
      co2Amount = value * factor.factor;
      unit = 'km';
      details = { mode, distance: value };
    } else if (category === 'electricity') {
      value = parseFloat(consumption);
      co2Amount = value * ELECTRICITY_FACTOR.factor;
      unit = 'kWh';
      details = { consumption: value };
    } else if (category === 'food') {
      const factor = FOOD_FACTORS[foodItem];
      value = parseFloat(servings);
      co2Amount = value * factor.factor;
      unit = 'servings';
      details = { foodItem, servings: value };
    }

    // Points calculation: Lower emissions = more points
    // Base points 100, subtract CO2 impact
    const pointsEarned = Math.max(10, Math.floor(100 - (co2Amount * 5)));

    try {
      const entry: Omit<EmissionEntry, 'id'> = {
        userId: user.uid,
        date: Timestamp.now(),
        category,
        value,
        unit,
        co2Amount,
        details,
        pointsEarned
      };

      await addDoc(collection(db, 'users', user.uid, 'emissions'), entry);
      
      // Update profile points and streak
      const profileRef = doc(db, 'users', user.uid);
      const today = format(new Date(), 'yyyy-MM-dd');
      const isNewDay = profile.lastActiveDate !== today;
      
      await setDoc(profileRef, {
        totalPoints: (profile.totalPoints || 0) + pointsEarned,
        currentStreak: isNewDay ? (profile.currentStreak || 0) + 1 : (profile.currentStreak || 1),
        lastActiveDate: today
      }, { merge: true });

      // Reset form
      setDistance('');
      setConsumption('');
      setServings('1');
      alert('Activity logged successfully! You earned ' + pointsEarned + ' points.');
    } catch (error) {
      console.error("Error logging activity:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <h3 className="text-2xl font-display font-bold text-stone-900 mb-6">Log New Activity</h3>
        
        <div className="flex gap-2 mb-8 p-1 bg-stone-100 rounded-2xl">
          {(['travel', 'electricity', 'food'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all capitalize",
                category === cat ? "bg-white text-emerald-600 shadow-sm" : "text-stone-500 hover:text-stone-700"
              )}
            >
              {cat === 'travel' ? <Car className="w-5 h-5" /> :
               cat === 'electricity' ? <Zap className="w-5 h-5" /> :
               <Utensils className="w-5 h-5" />}
              {cat}
            </button>
          ))}
        </div>

        <form onSubmit={handleLog} className="space-y-6">
          {category === 'travel' && (
            <>
              <Select 
                label="Mode of Transport"
                value={mode}
                onChange={(e: any) => setMode(e.target.value)}
                options={Object.entries(TRAVEL_FACTORS).map(([key, val]) => ({ value: key, label: val.label }))}
              />
              <Input 
                label="Distance (km)"
                type="number"
                value={distance}
                onChange={(e: any) => setDistance(e.target.value)}
                placeholder="How far did you travel?"
                min="0"
                required
              />
            </>
          )}

          {category === 'electricity' && (
            <Input 
              label="Electricity Consumed (kWh)"
              type="number"
              value={consumption}
              onChange={(e: any) => setConsumption(e.target.value)}
              placeholder="Check your meter or bill"
              min="0"
              required
            />
          )}

          {category === 'food' && (
            <>
              <Select 
                label="What did you eat?"
                value={foodItem}
                onChange={(e: any) => setFoodItem(e.target.value)}
                options={Object.entries(FOOD_FACTORS).map(([key, val]) => ({ value: key, label: val.label }))}
              />
              <Input 
                label="Number of Servings"
                type="number"
                value={servings}
                onChange={(e: any) => setServings(e.target.value)}
                min="1"
                required
              />
            </>
          )}

          <Button disabled={loading} className="w-full py-4 text-lg mt-4">
            {loading ? "Logging..." : "Log Activity"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Reports({ emissions }: { emissions: EmissionEntry[] }) {
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), i);
      return format(d, 'MMM dd');
    }).reverse();

    return last7Days.map(day => {
      const dayEmissions = emissions.filter(e => format(e.date.toDate(), 'MMM dd') === day);
      return {
        name: day,
        travel: dayEmissions.filter(e => e.category === 'travel').reduce((a, b) => a + b.co2Amount, 0),
        electricity: dayEmissions.filter(e => e.category === 'electricity').reduce((a, b) => a + b.co2Amount, 0),
        food: dayEmissions.filter(e => e.category === 'food').reduce((a, b) => a + b.co2Amount, 0),
      };
    });
  }, [emissions]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="h-96">
          <h4 className="font-bold text-stone-900 mb-6">Weekly Emission Trend</h4>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a8a29e' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a8a29e' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="travel" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="electricity" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="food" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="h-96">
          <h4 className="font-bold text-stone-900 mb-6">Cumulative Impact</h4>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a8a29e' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a8a29e' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="travel" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="electricity" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="food" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h4 className="font-bold text-stone-900 mb-4">Detailed History</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-stone-400 text-xs uppercase tracking-wider border-bottom border-stone-100">
                <th className="pb-4 font-bold">Date</th>
                <th className="pb-4 font-bold">Category</th>
                <th className="pb-4 font-bold">Details</th>
                <th className="pb-4 font-bold">Value</th>
                <th className="pb-4 font-bold">CO₂ (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {emissions.map((e: any) => (
                <tr key={e.id} className="text-sm">
                  <td className="py-4 text-stone-500">{format(e.date.toDate(), 'MMM dd, yyyy')}</td>
                  <td className="py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                      e.category === 'travel' ? "bg-emerald-50 text-emerald-600" :
                      e.category === 'electricity' ? "bg-amber-50 text-amber-600" :
                      "bg-blue-50 text-blue-600"
                    )}>
                      {e.category}
                    </span>
                  </td>
                  <td className="py-4 font-medium text-stone-900">
                    {e.category === 'travel' ? e.details.mode : 
                     e.category === 'food' ? e.details.foodItem : 'Household'}
                  </td>
                  <td className="py-4 text-stone-500">{e.value} {e.unit}</td>
                  <td className="py-4 font-bold text-stone-900">{e.co2Amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function WeatherCard({ city }: { city: string }) {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWeatherData(city).then(data => {
      setWeather(data);
      setLoading(false);
    });
  }, [city]);

  return (
    <Card className="bg-blue-600 text-white border-none flex flex-col justify-between">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-full py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          <p className="mt-2 text-xs text-blue-100">Loading weather...</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-950 font-bold">Current Weather</p>
              <h3 className="text-4xl font-bold mt-1 text-blue-950">{weather.temp}°C</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-2xl">
              <Cloud className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-blue-950 text-sm font-medium">
            <MapPin className="w-4 h-4" />
            <span>{city}, {weather.condition}</span>
          </div>
        </>
      )}
    </Card>
  );
}

function AIAssistant({ emissions }: { emissions: EmissionEntry[] }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Hi! I'm your Eco Assistant. Ask me anything about reducing your carbon footprint or your progress!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    const response = await chatWithAssistant(userMsg, []);
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
        <div className="p-2 bg-emerald-500 rounded-xl">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="font-bold text-stone-900">Eco Assistant</h4>
          <p className="text-xs text-stone-400">Powered by Gemini AI</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-hide">
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "flex",
            msg.role === 'user' ? "justify-end" : "justify-start"
          )}>
            <div className={cn(
              "max-w-[80%] p-4 rounded-2xl text-sm",
              msg.role === 'user' 
                ? "bg-emerald-600 text-white rounded-tr-none" 
                : "bg-stone-100 text-stone-800 rounded-tl-none"
            )}>
              <div className="prose prose-sm prose-stone dark:prose-invert max-w-none">
                <Markdown>
                  {msg.content}
                </Markdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-stone-100 p-4 rounded-2xl rounded-tl-none flex gap-1">
              <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 flex gap-2">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about your footprint..."
          className="flex-1 px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
        />
        <Button onClick={handleSend} disabled={loading}>
          Send
        </Button>
      </div>
    </Card>
  );
}
