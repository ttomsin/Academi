import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/AppProvider';
import { Trophy, Flame, Target, CheckCircle2, Circle, AlertCircle, Wand2, Frown, Meh, Smile, SmilePlus, Battery, BatteryFull, BatteryMedium, BatteryLow, Clock, X, Calendar, Sparkles, BrainCircuit, BookOpen } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { Star, Shield, Award, Hexagon, Flame as FlameIcon } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const RANKS = [
  { name: 'Bronze', threshold: 0, icon: Star, color: 'text-orange-700 font-bold', bg: 'bg-orange-100', border: 'border-orange-200', textAccent: 'text-orange-900', ring: 'ring-orange-500/20' },
  { name: 'Silver', threshold: 100, icon: Shield, color: 'text-slate-500 font-bold', bg: 'bg-slate-100', border: 'border-slate-200', textAccent: 'text-slate-700', ring: 'ring-slate-500/20' },
  { name: 'Gold', threshold: 300, icon: Award, color: 'text-yellow-600 font-bold', bg: 'bg-yellow-100', border: 'border-yellow-200', textAccent: 'text-yellow-900', ring: 'ring-yellow-500/20' },
  { name: 'Platinum', threshold: 600, icon: Target, color: 'text-cyan-600 font-bold', bg: 'bg-cyan-100', border: 'border-cyan-200', textAccent: 'text-cyan-900', ring: 'ring-cyan-500/20' },
  { name: 'Diamond', threshold: 1000, icon: Hexagon, color: 'text-indigo-600 font-bold', bg: 'bg-indigo-100', border: 'border-indigo-200', textAccent: 'text-indigo-900', ring: 'ring-indigo-500/20' },
  { name: 'Master', threshold: 1500, icon: Trophy, color: 'text-purple-600 font-bold', bg: 'bg-purple-100', border: 'border-purple-200', textAccent: 'text-purple-900', ring: 'ring-purple-500/20' },
  { name: 'Grandmaster', threshold: 2000, icon: FlameIcon, color: 'text-rose-600 font-bold', bg: 'bg-rose-100', border: 'border-rose-200', textAccent: 'text-rose-900', ring: 'ring-rose-500/20' },
] as const;

export function Dashboard() {
  const { user, tasks, courses, completeTask, recalculatePriorities } = useAppStore();
  const navigate = useNavigate();
  const [moodSaved, setMoodSaved] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleModal, setScheduleModal] = useState<any>(null);
  const [showMoodModal, setShowMoodModal] = useState(false);

  useEffect(() => {
    // Only show modal if user hasn't updated mood today
    const checkMoodStatus = () => {
       if (user && user.last_mood_update) {
         if (!isToday(parseISO(user.last_mood_update))) {
            setShowMoodModal(true);
         }
       } else if (user) {
         // Never updated
         setShowMoodModal(true);
       }
    };
    
    // Give a slight delay so it doesn't pop up immediately before dashboard renders
    const timer = setTimeout(checkMoodStatus, 1000);
    return () => clearTimeout(timer);
  }, [user]);

  if (!user) return null;

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  
  // Tasks to do today based on 'scheduled_start'
  const todayTasks = pendingTasks.filter(t => t.scheduled_start && isToday(parseISO(t.scheduled_start)));
  
  // Next upcoming tasks that aren't today
  const upcomingTasks = pendingTasks.filter(t => t.scheduled_start && !isToday(parseISO(t.scheduled_start))).slice(0, 3);
  
  const featuredTask = todayTasks[0];

  const currentRankInfo = RANKS.find(r => r.name === user.rank) || RANKS[0];
  const nextRankInfo = RANKS[RANKS.findIndex(r => r.name === user.rank) + 1];
  const currentThreshold = currentRankInfo.threshold;
  const nextThreshold = nextRankInfo?.threshold ?? currentThreshold;
  const progressPct = nextThreshold > currentThreshold
    ? Math.min(100, (((user?.points || 0) - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
    : 100;

  const handleRecordMood = async (mood_level: number, energy_level: number) => {
    try {
      await api.recordMood({ mood_level, energy_level, notes: 'Daily check-in' });
      setMoodSaved(true);
      toast.success('Mood registered! Your tasks have been reprioritized based on your energy.');
      setTimeout(() => {
         setMoodSaved(false);
         setShowMoodModal(false);
      }, 2000);
    } catch (e) {
      console.error(e);
      toast.error('Failed to save mood.');
    }
  };

  const handleSuggestSchedule = async () => {
    if (pendingTasks.length === 0) {
      toast.info('You need to add some tasks first!');
      return;
    }
    setSuggesting(true);
    try {
      // Pass actual pending tasks and user name for a personalized schedule
      const taskData = pendingTasks.map(t => ({
        title: t.title,
        deadline: t.deadline,
        estimated_duration_mins: t.estimated_duration_mins,
        priority_score: (t as any).priority_score,
      }));
      const res = await api.suggestSchedule(taskData, user.name);
      setScheduleModal(res);
    } catch (e) {
      toast.error('Failed to get AI schedule suggestion.');
    } finally {
      setSuggesting(false);
    }
  };

  const handleRecalculatePriorities = async () => {
    if (pendingTasks.length === 0) {
      toast.info('You need to add some tasks first!');
      return;
    }
    recalculatePriorities();
  }

  const handleSaveSchedule = async () => {
    if (!scheduleModal || !scheduleModal.schedule) return;
    setSavingSchedule(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      for (const slot of scheduleModal.schedule) {
        let startTime = new Date().toISOString();
        try {
          startTime = new Date(`${todayStr} ${slot.time}`).toISOString();
        } catch (e) {}

        const matchedTask = pendingTasks.find(t => t.title.toLowerCase().includes(slot.task.toLowerCase()) || slot.task.toLowerCase().includes(t.title.toLowerCase()));

        await api.createSchedule({
          date: todayStr,
          start_time: startTime,
          end_time: new Date(new Date(startTime).getTime() + 60*60*1000).toISOString(),
          status: 'scheduled',
          task_id: matchedTask?.id || null,
        });
      }
      toast.success('Schedule saved to your calendar!');
      setScheduleModal(null);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to save schedule: ' + (e.message || 'Unknown error'));
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-300">
      
      {/* Mood Check-in Modal */}
      {showMoodModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowMoodModal(false)}>
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="bg-indigo-600 p-6 text-center text-white relative">
                 <button onClick={() => setShowMoodModal(false)} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors">
                   <X className="w-5 h-5" />
                 </button>
                 <BrainCircuit className="w-12 h-12 mx-auto mb-3 text-indigo-200" />
                 <h3 className="text-xl font-black">Daily AI Check-in</h3>
                 <p className="text-indigo-100 text-sm mt-1 opacity-90">How are your energy levels today?</p>
              </div>
              
              <div className="p-6 bg-slate-50">
                {moodSaved ? (
                  <div className="flex flex-col items-center justify-center py-6 text-emerald-600">
                    <CheckCircle2 className="w-12 h-12 mb-3" />
                    <span className="text-sm font-bold uppercase tracking-wider text-center">Energy logged!<br/>Tasks reprioritized.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleRecordMood(2, 2)} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-rose-300 hover:bg-rose-50 transition-all text-slate-500 hover:text-rose-600 group flex flex-col items-center shadow-sm">
                       <Frown className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-black uppercase tracking-wider">Exhausted</span>
                       <span className="text-[9px] text-slate-400 mt-1 text-center">Focus on easy tasks</span>
                    </button>
                    <button onClick={() => handleRecordMood(4, 4)} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-amber-300 hover:bg-amber-50 transition-all text-slate-500 hover:text-amber-600 group flex flex-col items-center shadow-sm">
                       <Meh className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-black uppercase tracking-wider">Okay</span>
                       <span className="text-[9px] text-slate-400 mt-1 text-center">Balanced workload</span>
                    </button>
                    <button onClick={() => handleRecordMood(7, 7)} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-300 hover:bg-emerald-50 transition-all text-slate-500 hover:text-emerald-600 group flex flex-col items-center shadow-sm">
                       <Smile className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-black uppercase tracking-wider">Good</span>
                       <span className="text-[9px] text-slate-400 mt-1 text-center">Ready to work</span>
                    </button>
                    <button onClick={() => handleRecordMood(9, 9)} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50 transition-all text-slate-500 hover:text-indigo-600 group flex flex-col items-center shadow-sm">
                       <SmilePlus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-black uppercase tracking-wider">Energized</span>
                       <span className="text-[9px] text-slate-400 mt-1 text-center">Tackle hard tasks</span>
                    </button>
                  </div>
                )}
              </div>
           </div>
        </div>
      )}

      {/* AI Schedule Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setScheduleModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white relative z-10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="font-bold text-slate-900">AI Schedule Plan</h3>
              </div>
              <button onClick={() => setScheduleModal(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto bg-slate-50/50">
              {scheduleModal.greeting && (
                <div className="bg-indigo-600 text-white rounded-2xl p-4 shadow-md shadow-indigo-200">
                  <p className="text-sm font-medium leading-relaxed">{scheduleModal.greeting}</p>
                </div>
              )}
              
              {scheduleModal.schedule && scheduleModal.schedule.length > 0 && (
                <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {scheduleModal.schedule.map((slot: any, i: number) => (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md">{slot.time}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1 leading-tight">{slot.task}</h4>
                        {slot.tip && <p className="text-xs text-slate-500 mt-2 leading-relaxed bg-slate-50 p-2 rounded-lg">{slot.tip}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {scheduleModal.daily_tip && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 items-start mt-6">
                  <div className="bg-amber-200/50 p-2 rounded-xl shrink-0 mt-0.5">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-800 mb-1">Focus Tip of the Day</p>
                    <p className="text-sm text-amber-900 leading-relaxed font-medium">{scheduleModal.daily_tip}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white shrink-0">
              <button 
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
                className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-sm"
              >
                {savingSchedule ? <div className="w-5 h-5 animate-spin border-2 border-white border-t-transparent rounded-full" /> : <Calendar className="w-5 h-5" />}
                {savingSchedule ? 'Saving...' : 'Save to Calendar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header / Profile Section */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center space-x-3">
          <div className={cn("w-12 h-12 rounded-2xl border-2 flex items-center justify-center font-bold uppercase shrink-0 shadow-sm", currentRankInfo.bg, currentRankInfo.color.split(' ')[0], currentRankInfo.border)}>
             {(user?.name || 'A').split(' ').map(n => n[0]).join('').substring(0, 2)}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">Hi, {user.name?.split(' ')[0]} 👋</h2>
            <p className={cn("text-[10px] uppercase tracking-widest font-black flex items-center gap-1", currentRankInfo.color.split(' ')[0])}>
              {user.rank} {user.major ? `• ${user.major}` : ''}
            </p>
          </div>
        </div>
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-full text-xs font-black uppercase flex items-center gap-1.5 shadow-sm">
          {user.streak} <Flame className="w-4 h-4 fill-orange-500 text-orange-600" />
        </div>
      </div>

      {/* Dashboard Action Bar */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={handleSuggestSchedule}
          disabled={suggesting || pendingTasks.length === 0}
          className={cn(
            "bg-white border hover:shadow p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all group",
            pendingTasks.length === 0 ? "border-slate-100 opacity-80" : "border-slate-200 hover:border-indigo-300 shadow-sm"
          )}
        >
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
             {suggesting ? <div className="w-5 h-5 animate-spin border-2 border-indigo-600 border-t-transparent rounded-full" /> : <Wand2 className="w-5 h-5" />}
          </div>
          <h3 className="font-bold text-slate-900 text-sm">AI Schedule</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Plan my day</p>
        </button>

        <button 
          onClick={handleRecalculatePriorities}
          disabled={pendingTasks.length === 0}
          className={cn(
            "bg-white border hover:shadow p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all group",
            pendingTasks.length === 0 ? "border-slate-100 opacity-80" : "border-slate-200 hover:border-emerald-300 shadow-sm"
          )}
        >
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
             <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Prioritize</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Sort by urgency</p>
        </button>
      </div>

      {/* Main Smart Action Bento Section */}
      {featuredTask ? (
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="flex justify-between items-start mb-4 relative z-10">
            <span className="text-[10px] bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg font-bold shrink-0 flex items-center gap-1.5 uppercase tracking-wider border border-white/10">
              <Target className="w-3.5 h-3.5" /> Next Focus
            </span>
            {featuredTask.deadline && (
               <span className="text-[10px] font-bold bg-rose-500/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-rose-500/50">
                 Due {format(parseISO(featuredTask.deadline), 'MMM d')}
               </span>
            )}
          </div>
          
          <h3 className="text-xl md:text-2xl font-black leading-tight mb-2 relative z-10">{featuredTask.title}</h3>
          
          <div className="flex items-center gap-2 mb-6 text-indigo-100 text-sm font-medium relative z-10">
            <BookOpen className="w-4 h-4" />
            <span>{featuredTask.course?.code || 'General Task'}</span>
            <span className="mx-2 opacity-50">•</span>
            <Clock className="w-4 h-4" />
            <span>~{featuredTask.estimated_duration_mins || 30} mins</span>
          </div>
          
          <div className="flex items-center gap-3 relative z-10">
            <button 
              onClick={() => completeTask(featuredTask.id)}
              className="flex-1 bg-white text-indigo-600 font-bold py-3.5 rounded-xl text-sm hover:bg-slate-50 hover:scale-[1.02] transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" /> Mark Complete
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white shadow-xl shadow-emerald-200/50 flex flex-col items-center text-center relative overflow-hidden">
           <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
           <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/20 relative z-10">
             <CheckCircle2 className="w-8 h-8 text-white" />
           </div>
           <h3 className="text-2xl font-black leading-tight relative z-10">All Caught Up!</h3>
           <p className="text-emerald-50 mt-2 text-sm max-w-xs relative z-10">You've cleared your schedule. Enjoy your free time or add a new task to get ahead.</p>
        </div>
      )}

      {/* Progress & Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Course Progress Mini */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-xl font-black text-slate-900">{courses.length}</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Courses</p>
        </div>

        {/* Rank Mini */}
        <div className={cn("border p-5 rounded-2xl shadow-sm flex flex-col justify-center relative overflow-hidden", currentRankInfo.bg, currentRankInfo.border)}>
          <div className={cn("absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-10", currentRankInfo.color.replace('text-', 'bg-').split(' ')[0])}></div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center bg-white/50", currentRankInfo.color.split(' ')[0])}>
              <currentRankInfo.icon className="w-4 h-4" />
            </div>
            <span className={cn("text-xl font-black", currentRankInfo.textAccent)}>{user.points}</span>
          </div>
          <p className={cn("text-[10px] font-black uppercase tracking-widest relative z-10", currentRankInfo.textAccent)}>Total XP</p>
        </div>
      </div>

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" /> Upcoming
            </h4>
            <button onClick={() => navigate('/schedule')} className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {upcomingTasks.map((task, i) => (
              <div key={task.id} className="flex items-center group cursor-pointer" onClick={() => navigate('/tasks')}>
                 <div className={`w-1.5 h-10 rounded-full mr-3 shrink-0 ${i === 0 ? 'bg-amber-400' : 'bg-slate-200 group-hover:bg-slate-300'} transition-colors`}></div>
                 <div className="flex-1 min-w-0 py-1">
                   <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{task.title}</p>
                   <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                     {task.scheduled_start ? format(parseISO(task.scheduled_start), 'EEEE • h:mm a') : 'Not scheduled'}
                   </p>
                 </div>
                 <div className="shrink-0 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-indigo-600">+{(task as any).points_value || 10} XP</p>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}