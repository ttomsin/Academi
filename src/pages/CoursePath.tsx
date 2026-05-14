import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, BrainCircuit, Wand2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Course, CourseMaterial } from '../types';

export function CoursePath() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  
  const [studyPath, setStudyPath] = useState<any>(null);
  const [generatingPath, setGeneratingPath] = useState(false);

  useEffect(() => {
    fetchCourseAndPath();
  }, [id]);

  const fetchCourseAndPath = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.getCourse(id);
      setCourse(res.data || res);
      
      const mats = await api.getCourseMaterials(id);
      setMaterials(mats);

      const pathRes = await api.getStudyPath(id).catch(() => null);
      if (pathRes && pathRes.data) {
        setStudyPath(pathRes.data);
      } else if (pathRes) {
        setStudyPath(pathRes);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStudyPath = async () => {
    if (!id || !course) return;
    setGeneratingPath(true);
    try {
      const materialsSummary = materials.length > 0
        ? materials.map(m => m.title).join(', ')
        : undefined;

      const res = await api.generateStudyPath(id, {
        course_name: course.name,
        course_code: course.code,
        materials_summary: materialsSummary,
      });
      setStudyPath(res?.generated_path || res);
      toast.success('Study path generated!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate study path.');
    } finally {
      setGeneratingPath(false);
    }
  };

  if (loading) {
     return (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      );
  }

  if (!course) {
     return (
       <div className="text-center py-20">
         <h2 className="text-xl font-bold text-slate-800">Course not found</h2>
         <button onClick={() => navigate('/courses')} className="mt-4 text-indigo-600 font-medium hover:underline">Return to Courses</button>
       </div>
     );
  }

  return (
    <div className="space-y-6 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(`/courses/${id}`)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">AI Study Path</h2>
          <p className="text-slate-500 font-medium text-sm">{course.code} - {course.name}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-slate-900">AI Study Path</h3>
          </div>
          <button
            onClick={handleGenerateStudyPath}
            disabled={generatingPath}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            {generatingPath ? <div className="w-3 h-3 animate-spin border-2 border-indigo-600 border-t-transparent rounded-full" /> : <Wand2 className="w-3 h-3" />}
            {generatingPath ? 'Generating...' : studyPath ? 'Regenerate' : 'Generate Path'}
          </button>
        </div>
        {!studyPath ? (
          <p className="text-xs text-slate-500 italic">
            Click "Generate Path" to get a personalized week-by-week study plan for {course.code}.
          </p>
        ) : (
          <div className="space-y-3">
            {(studyPath.weeks || []).map((week: any, idx: number) => (
              <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-indigo-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                    {week.week || idx + 1}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{week.focus}</h4>
                </div>
                {week.activities && (
                  <ul className="space-y-1 ml-8 mb-2">
                    {week.activities.map((act: string, i: number) => (
                      <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                        <ChevronRight className="w-3 h-3 shrink-0 text-indigo-400 mt-0.5" />{act}
                      </li>
                    ))}
                  </ul>
                )}
                {week.goal && (
                  <p className="ml-8 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg font-medium">🎯 {week.goal}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
