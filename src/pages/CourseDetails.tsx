import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, FileText, ChevronRight, FileUp, FileType, Trash2, FolderOpen, BrainCircuit } from 'lucide-react';
import { toast } from 'sonner';
import { Course, CourseMaterial } from '../types';

export function CourseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [materialFile, setMaterialFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCourseDetails();
    fetchMaterials();
  }, [id]);

  const fetchCourseDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.getCourse(id);
      setCourse(res.data || res); 
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    if (!id) return;
    try {
      const mats = await api.getCourseMaterials(id);
      setMaterials(mats);
    } catch (error) {
      console.error("Failed to load materials", error);
    }
  };

  const handleDeleteMaterial = async (matId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this material?")) return;
    try {
      await api.deleteCourseMaterial(matId);
      setMaterials(materials.filter(m => m.id !== matId));
      localStorage.removeItem(`material_notes_${matId}`);
      localStorage.removeItem(`material_plan_${matId}`);
      toast.success('Material deleted');
    } catch (error: any) {
      toast.error('Failed to delete material');
    }
  };

  const handleUploadMaterial = async () => {
    if (!materialFile || !id) return;
    setUploadingMaterial(true);
    try {
      // 1. Extract text
      const extractedText = await api.parsePdf(materialFile);
      
      // 2. Save material with extracted text
      const newMaterialRaw = await api.createCourseMaterial({
        course_id: Number(id),
        title: materialFile.name,
        extracted_text: extractedText
      });
      
      const newMaterial = newMaterialRaw?.data || newMaterialRaw;
      
      setMaterials([newMaterial, ...materials]);
      setMaterialFile(null);
      toast.success('Material uploaded and text extracted!');
      
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to upload material: ' + e.message);
    } finally {
      setUploadingMaterial(false);
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
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/courses')} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{course.code}</h2>
            <p className="text-slate-500 font-medium text-sm">{course.name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <button 
          onClick={() => navigate(`/courses/${id}/syllabus`)}
          className="bg-white border border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all group"
        >
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
             <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900">Syllabus Analyzer</h3>
          <p className="text-xs text-slate-500 mt-1">Upload syllabus to extract schedule</p>
        </button>

        <button 
          onClick={() => navigate(`/courses/${id}/path`)}
          className="bg-white border border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all group"
        >
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
             <BrainCircuit className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900">AI Study Path</h3>
          <p className="text-xs text-slate-500 mt-1">Generate a week-by-week learning plan</p>
        </button>
      </div>

      {/* Course Materials / Workspace */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileType className="w-5 h-5 text-indigo-500" />
          <h3 className="text-lg font-bold text-slate-900">Course Materials</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Upload PDF readings or lecture slides. The AI will extract the text and can generate personalized study notes or turn the material into an actionable study plan tailored to your profile.
        </p>
        
        <div className="flex items-center gap-3 mb-6">
          <input 
             type="file" 
             accept=".pdf" 
             id="material-upload"
             className="hidden" 
             onChange={(e) => setMaterialFile(e.target.files?.[0] || null)} 
          />
          <label htmlFor="material-upload" className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
             <FileUp className="w-4 h-4" />
             {materialFile ? materialFile.name : "Select PDF Material"}
          </label>
          <button 
             onClick={handleUploadMaterial}
             disabled={!materialFile || uploadingMaterial}
             className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl font-medium text-xs tracking-wide uppercase disabled:cursor-not-allowed transition-colors"
          >
             {uploadingMaterial ? "Extracting Text..." : "Upload & Parse"}
          </button>
        </div>

        {materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 bg-slate-50/80 border border-slate-100 rounded-2xl text-center">
            <FolderOpen className="w-12 h-12 text-indigo-200 mb-4" />
            <h4 className="text-slate-800 font-bold text-lg">No materials yet</h4>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">
              Upload your first PDF lecture slide or reading above to generate smart notes and study plans.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {materials.map((mat) => (
                  <div key={mat.id} className="flex items-center w-full text-left transition-colors hover:bg-slate-50 border border-slate-100 rounded-xl group bg-white p-2">
                    <button 
                      onClick={() => navigate(`/courses/${id}/materials/${mat.id}`)}
                      className="flex-grow flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="flex-1 text-left truncate">{mat.title}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteMaterial(mat.id, e)}
                      className="p-2 text-slate-300 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      title="Delete Material"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
          </div>
        )}
      </div>

    </div>
  );
}
