import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, Upload, FileText, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '../store/AppProvider';

export function CourseSyllabus() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addTask, courses } = useAppStore();
  
  const [syllabusText, setSyllabusText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);

  const course = courses.find(c => String(c.id) === id);

  const handleParseSyllabus = async () => {
    if (!syllabusText.trim() && !file) return;
    setParsing(true);
    try {
      const data = await api.parseSyllabus({ 
         course_id: Number(id), 
         syllabus_text: syllabusText,
         file: file || undefined
      });
      setParsedData(data);
      setSyllabusText(''); 
      setFile(null);

      // Automatically add assessments as tasks with their weights
      if (data && data.assessments && Array.isArray(data.assessments)) {
          for (const assessment of data.assessments) {
              const taskType = assessment.type === 'exam' ? 'exam' : 
                               assessment.type === 'quiz' ? 'quiz' : 
                               assessment.type === 'project' ? 'project' : 'assignment';
                               
              // Calculate a reasonable deadline if not provided, or parse the provided one
              let deadlineIso = new Date().toISOString();
              try {
                 if (assessment.due_date) {
                    const parsedDate = new Date(assessment.due_date);
                    if (!isNaN(parsedDate.getTime())) {
                       deadlineIso = parsedDate.toISOString();
                    }
                 }
              } catch(e) {}

              // Extract numerical weight
              let weightNum = 0;
              if (typeof assessment.weight === 'number') {
                 weightNum = assessment.weight;
              } else if (typeof assessment.weight === 'string') {
                 const match = assessment.weight.match(/(\d+(\.\d+)?)/);
                 if (match) weightNum = parseFloat(match[1]);
              }

              await addTask({
                 title: assessment.title || 'Course Assessment',
                 course_id: Number(id),
                 course: course || null,
                 type: taskType,
                 status: 'pending',
                 deadline: deadlineIso,
                 assessment_weight: weightNum > 0 ? weightNum : undefined
              });
          }
          toast.success(`Syllabus analyzed! Added ${data.assessments.length} assessments to your tasks.`);
      } else {
          toast.success('Syllabus analyzed! AI will incorporate this into your schedule.');
      }

    } catch (error) {
      console.error(error);
      toast.error('Failed to parse syllabus. Check your file and try again.');
    } finally {
       setParsing(false);
    }
  };

  return (
    <div className="space-y-6 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(`/courses/${id}`)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Syllabus Analyzer</h2>
          <p className="text-slate-500 font-medium text-sm">Upload syllabus to extract schedule</p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 sm:p-6">
         <div className="flex items-center gap-2 mb-4">
           <FileText className="w-5 h-5 text-indigo-500" />
           <h3 className="text-lg font-bold text-slate-900">AI Syllabus Analyzer</h3>
         </div>
         
         {!parsedData ? (
           <div className="space-y-4">
             <p className="text-xs text-slate-500 leading-relaxed">
               Upload your course syllabus as PDF or text, or paste the content below. Our AI will automatically extract assessments, deadlines, and weekly topics and schedule them for you.
             </p>
             <div className="flex flex-col gap-2">
                 <label className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                    <input 
                       type="file" 
                       accept=".pdf,.txt" 
                       className="hidden" 
                       onChange={(e) => setFile(e.target.files?.[0] || null)} 
                    />
                    <Upload className="w-6 h-6 text-slate-400 mb-2" />
                    <span className="text-sm text-slate-600 font-medium">
                       {file ? file.name : 'Click to upload PDF/Text syllabus'}
                    </span>
                 </label>
                 <div className="text-center text-xs text-slate-400 font-medium">OR</div>
                 <textarea 
                   rows={8}
                   value={syllabusText}
                   onChange={(e) => setSyllabusText(e.target.value)}
                   placeholder="Paste syllabus content here..."
                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                 />
             </div>
             <button 
               onClick={handleParseSyllabus}
               disabled={parsing || (!syllabusText.trim() && !file)}
               className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
             >
               {parsing ? <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full" /> : <BrainCircuit className="w-4 h-4" />}
               Parse & Integrate
             </button>
           </div>
         ) : (
           <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
              <h4 className="font-bold text-emerald-900">Syllabus Analyzed!</h4>
              <p className="text-xs text-emerald-700 mt-1">Assessments and topics have been processed and integrated.</p>
              {parsedData.assessments && (
                 <p className="text-[10px] uppercase font-bold text-emerald-600 mt-4 tracking-wider">
                   {parsedData.assessments.length} Assessments Found and added to your tasks!
                 </p>
              )}
           </div>
         )}
      </div>
    </div>
  );
}