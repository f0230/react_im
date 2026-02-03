import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  Layers,
  Target,
  Activity,
  Zap,
  Layout,
  Search,
  MessageSquare,
  FileText,
  User,
  ArrowLeft,
  ChevronRight,
  Send,
  Paperclip,
  Download,
  MoreVertical,
  Briefcase,
  Plus,
  X,
  UserPlus,
  Edit3,
  Save,
  UploadCloud,
  Loader2,
  Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';

const ProjectServices = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryProjectId = searchParams.get('projectId');
  const { user, profile, client } = useAuth();

  // State
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list', 'detail', 'comments'

  const [loading, setLoading] = useState(true);
  const [serviceLoading, setServiceLoading] = useState(false);

  // Detail Data
  const [comments, setComments] = useState([]);
  const [files, setFiles] = useState([]);
  const [teamMembersMap, setTeamMembersMap] = useState({}); // Map of id -> profile
  const [allWorkers, setAllWorkers] = useState([]); // List for assignment

  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Management Helpers
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedDesc, setEditedDesc] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingDesc, setIsSavingDesc] = useState(false);

  // UI Helpers
  const [isCreateServiceOpen, setIsCreateServiceOpen] = useState(false);
  const [newServiceTitle, setNewServiceTitle] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isEditingService, setIsEditingService] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const isAdmin = profile?.role === 'admin';
  const isWorker = profile?.role === 'worker';
  const canManage = isAdmin || isWorker;

  // 1. Fetch Projects
  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    let query = supabase.from('projects')
      .select('*, clients (id, full_name, company_name), project_assignments(worker_id)')
      .order('created_at', { ascending: false });

    if (isWorker) {
      const { data: assignments } = await supabase
        .from('project_assignments')
        .select('project_id')
        .eq('worker_id', user.id);
      const projectIds = assignments?.map(a => a.project_id) || [];
      query = query.in('id', projectIds);
    } else if (client?.id) {
      query = query.eq('client_id', client.id);
    } else if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;
    if (!error && data) {
      setProjects(data);
      let active = queryProjectId ? data.find(p => p.id === queryProjectId) : (data[0] || null);
      if (active) setSelectedProject(active);
    }
    setLoading(false);
  }, [user?.id, profile?.role, client?.id, queryProjectId, isAdmin, isWorker]);

  // 2. Fetch Services
  const fetchServices = useCallback(async (projectId) => {
    if (!projectId) return;
    setServiceLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (!error) setServices(data || []);
    setServiceLoading(false);
  }, []);

  // 3. Fetch Service Details
  const fetchServiceDetails = useCallback(async (serviceId) => {
    if (!serviceId) return;

    const { data: commentsData } = await supabase
      .from('service_comments')
      .select('*, profiles(id, full_name, avatar_url)')
      .eq('service_id', serviceId)
      .order('created_at', { ascending: true });

    if (commentsData) setComments(commentsData);

    const { data: filesData } = await supabase
      .from('service_files')
      .select('*')
      .eq('service_id', serviceId)
      .order('created_at', { ascending: false });

    if (filesData) setFiles(filesData);
  }, []);

  // 4. Fetch Workers for assignment
  const fetchAllWorkers = useCallback(async () => {
    if (!isAdmin) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .in('role', ['admin', 'worker']);
    if (data) setAllWorkers(data);
  }, [isAdmin]);

  // 5. Fetch Profiles for UI
  const fetchTeamMemberProfiles = useCallback(async (ids) => {
    if (!ids || ids.length === 0) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .in('id', ids);

    if (data) {
      setTeamMembersMap(prev => {
        const updated = { ...prev };
        data.forEach(d => updated[d.id] = d);
        return updated;
      });
    }
  }, []);

  useEffect(() => { fetchProjects(); fetchAllWorkers(); }, [fetchProjects, fetchAllWorkers]);

  useEffect(() => {
    if (selectedProject?.id) {
      fetchServices(selectedProject.id);
      const ids = selectedProject.project_assignments?.map(pa => pa.worker_id) || [];
      fetchTeamMemberProfiles(ids);
    }
  }, [selectedProject, fetchServices, fetchTeamMemberProfiles]);

  useEffect(() => {
    if (selectedService?.id) {
      fetchServiceDetails(selectedService.id);
      setEditedDesc(selectedService.description || '');
      setEditedTitle(selectedService.title || '');
      setIsEditingDesc(false);
      setIsEditingService(false);
      setMobileView('detail'); // Switch to detail view on mobile
      if (selectedService.responsible_id && !teamMembersMap[selectedService.responsible_id]) {
        fetchTeamMemberProfiles([selectedService.responsible_id]);
      }
    }
  }, [selectedService, fetchServiceDetails, fetchTeamMemberProfiles]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  // HANDLERS
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedService || isSending) return;

    setIsSending(true);
    const { data, error } = await supabase
      .from('service_comments')
      .insert({
        service_id: selectedService.id,
        author_id: user.id,
        body: newComment.trim()
      })
      .select('*, profiles(id, full_name, avatar_url)')
      .single();

    if (!error && data) {
      setComments(prev => [...prev, data]);
      setNewComment('');
    }
    setIsSending(false);
  };

  const handleUpdateDescription = async () => {
    if (!selectedService || isSavingDesc) return;
    setIsSavingDesc(true);
    const { error } = await supabase
      .from('services')
      .update({ description: editedDesc })
      .eq('id', selectedService.id);

    if (!error) {
      setSelectedService(prev => ({ ...prev, description: editedDesc }));
      setServices(prev => prev.map(s => s.id === selectedService.id ? { ...s, description: editedDesc } : s));
      setIsEditingDesc(false);
    } else {
      console.error('Error updating description:', error.message, error.details, error.hint);
      alert(`Error al actualizar descripción: ${error.message}`);
    }
    setIsSavingDesc(false);
  };

  const handleSaveService = async () => {
    if (!selectedService || isSavingDesc) return;
    setIsSavingDesc(true);
    const { error } = await supabase
      .from('services')
      .update({
        title: editedTitle.trim(),
        description: editedDesc.trim()
      })
      .eq('id', selectedService.id);

    if (!error) {
      setSelectedService(prev => ({ ...prev, title: editedTitle.trim(), description: editedDesc.trim() }));
      setServices(prev => prev.map(s => s.id === selectedService.id ? { ...s, title: editedTitle.trim(), description: editedDesc.trim() } : s));
      setIsEditingService(false);
    } else {
      console.error('Error saving service:', error.message);
      alert(`Error al guardar: ${error.message}`);
    }
    setIsSavingDesc(false);
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm('¿Estás seguro de eliminar este archivo?')) return;

    // 1. Delete from Storage
    const storagePath = file.file_url.split('/storage/v1/object/public/service-attachments/')[1];
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('service-attachments')
        .remove([storagePath]);
      if (storageError) console.error('Storage delete error:', storageError);
    }

    // 2. Delete from DB
    const { error } = await supabase
      .from('service_files')
      .delete()
      .eq('id', file.id);

    if (!error) {
      setFiles(prev => prev.filter(f => f.id !== file.id));
    } else {
      console.error('DB delete error:', error);
      alert(`Error al eliminar registro: ${error.message}`);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedService) return;

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${selectedService.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('service-attachments')
      .upload(filePath, file);

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('service-attachments')
        .getPublicUrl(filePath);

      const { data, error: insertError } = await supabase
        .from('service_files')
        .insert({
          service_id: selectedService.id,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (!insertError && data) {
        setFiles(prev => [data, ...prev]);
      }
    }
    setIsUploading(false);
  };

  const handleAssignResponsible = async (workerId) => {
    if (!selectedService) return;
    const { error } = await supabase
      .from('services')
      .update({ responsible_id: workerId })
      .eq('id', selectedService.id);

    if (!error) {
      setSelectedService(prev => ({ ...prev, responsible_id: workerId }));
      setIsAssigning(false);
      if (workerId && !teamMembersMap[workerId]) fetchTeamMemberProfiles([workerId]);
    } else {
      console.error('Error assigning responsible:', error.message, error.details, error.hint);
      alert(`Error al asignar responsable: ${error.message}`);
    }
  };

  const handleCreateService = async () => {
    if (!newServiceTitle.trim() || !selectedProject) return;
    const { data, error } = await supabase
      .from('services')
      .insert({
        project_id: selectedProject.id,
        title: newServiceTitle.trim(),
        description: 'Nueva descripción de servicio',
      })
      .select()
      .single();

    if (!error && data) {
      setServices(prev => [data, ...prev]);
      setNewServiceTitle('');
      setIsCreateServiceOpen(false);
      setSelectedService(data);
      setShowDetail(true);
    }
  };

  const projectTeam = useMemo(() => {
    const ids = selectedProject?.project_assignments?.map(pa => pa.worker_id) || [];
    return ids.map(id => teamMembersMap[id]).filter(Boolean);
  }, [selectedProject, teamMembersMap]);

  if (loading) return <LoadingFallback type="spinner" />;

  return (
    <div className="font-product min-h-screen md:min-h-[calc(100vh-140px)] max-w-[1500px] mx-auto w-full px-2 md:px-8 flex flex-col justify-center py-2 md:py-8 overflow-hidden">
      <div className="flex flex-col md:flex-row gap-4 lg:gap-6 h-[calc(100vh-80px)] md:h-[650px] lg:h-[750px] overflow-hidden w-full relative">

        {/* LEFT COLUMN - SERVICE LIST */}
        <div className={`w-full md:w-[320px] lg:w-[360px] flex flex-col bg-white rounded-[24px] md:rounded-[32px] border border-neutral-100 shadow-sm overflow-hidden h-full shrink-0 transition-all ${mobileView !== 'list' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 bg-neutral-100/50 border-b border-neutral-100 flex flex-col items-center text-center">
            <div className="w-20 h-20 md:w-24 md:h-24 mb-4 rounded-full bg-gradient-to-br from-lime-400 to-emerald-600 shadow-lg flex items-center justify-center text-2xl font-black text-black overflow-hidden bg-white">
              {selectedProject?.profile_image_url ? (
                <img src={selectedProject.profile_image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="opacity-40 text-sm">DTE</span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-black text-neutral-800 tracking-tight">
              {selectedProject?.title || 'Proyecto'}
            </h2>
            <div className="mt-3 md:mt-4 flex flex-col items-center gap-2">
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-neutral-400">Equipo</span>
              <div className="flex items-center -space-x-2">
                {projectTeam.length > 0 ? projectTeam.slice(0, 5).map((member, i) => (
                  <div key={i} className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white bg-white shadow-sm overflow-hidden" title={member.full_name}>
                    <img src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.full_name}`} alt="" className="w-full h-full object-cover" />
                  </div>
                )) : (
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center">
                    <User size={10} className="text-neutral-300" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-[#EBEBEB]">
            <div className="p-5 md:p-6 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-neutral-800">Servicios</h3>
                <p className="text-[9px] md:text-[10px] text-neutral-500 uppercase tracking-wide">Seguimiento en curso</p>
              </div>
              {isAdmin && (
                <button onClick={() => setIsCreateServiceOpen(!isCreateServiceOpen)} className="p-2 rounded-full bg-black text-white hover:bg-neutral-800 transition-all shadow-md">
                  {isCreateServiceOpen ? <X size={14} /> : <Plus size={14} />}
                </button>
              )}
            </div>

            <AnimatePresence>
              {isCreateServiceOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-5 md:px-6 pb-4">
                  <div className="flex gap-2">
                    <input value={newServiceTitle} onChange={(e) => setNewServiceTitle(e.target.value)} type="text" placeholder="Nombre..." className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-black" />
                    <button onClick={handleCreateService} className="px-4 py-2 bg-black text-white text-xs font-bold rounded-xl">Crear</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto px-5 md:px-6 py-4 space-y-2 scrollbar-hide">
              {services.map(s => (
                <motion.div
                  key={s.id}
                  onClick={() => {
                    setSelectedService(s);
                    setShowDetail(true);
                    setMobileView('detail');
                  }}
                  className={`group p-4 rounded-xl cursor-pointer transition-all border flex items-center justify-between ${selectedService?.id === s.id ? 'bg-black/5 border-black/10' : 'bg-white/50 border-white/40 hover:bg-white hover:shadow-sm'}`}
                >
                  <div className="flex flex-col gap-1">
                    <span className={`self-start px-2 py-0.5 rounded text-[9px] font-bold uppercase ${selectedService?.id === s.id ? 'bg-black text-white' : 'bg-rose-100 text-rose-500'}`}>{selectedProject?.title || 'DTE'}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-800 text-sm">{s.title}</span>
                      {s.responsible_id && teamMembersMap[s.responsible_id] && (
                        <div className="w-5 h-5 rounded-full overflow-hidden border border-white shadow-sm shrink-0" title={`Responsable: ${teamMembersMap[s.responsible_id].full_name}`}>
                          <img src={teamMembersMap[s.responsible_id].avatar_url || `https://ui-avatars.com/api/?name=${teamMembersMap[s.responsible_id].full_name}`} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={16} className={selectedService?.id === s.id ? 'text-black' : 'text-neutral-300 group-hover:text-black'} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - DETAIL & COMMENTS */}
        <div className={`flex-1 flex flex-col bg-[#EBEBEB] rounded-[24px] md:rounded-[32px] overflow-hidden transition-all h-full ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
          {selectedService ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col lg:flex-row h-full overflow-hidden relative"
            >

              {/* Mobile View Toggles (Detail/Comments) */}
              <div className="flex md:hidden bg-white border-b border-neutral-100 p-1 mx-4 mt-4 rounded-xl shadow-sm z-10">
                <button
                  onClick={() => setMobileView('detail')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mobileView === 'detail' ? 'bg-black text-white shadow-md' : 'text-neutral-400'}`}
                >
                  Detalles
                </button>
                <button
                  onClick={() => setMobileView('comments')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mobileView === 'comments' ? 'bg-black text-white shadow-md' : 'text-neutral-400'}`}
                >
                  Chat {comments.length > 0 && `(${comments.length})`}
                </button>
              </div>

              {/* Detail Info Panel */}
              <div className={`flex-1 flex flex-col border-r border-neutral-200/40 p-5 md:p-6 lg:p-8 space-y-6 overflow-y-auto scrollbar-hide ${mobileView === 'comments' ? 'hidden lg:flex' : 'flex'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Back Button for mobile - High Visibility */}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setMobileView('list')}
                      className="flex md:hidden items-center gap-2 px-3 py-2 bg-neutral-100/80 border border-neutral-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3 hover:text-black hover:bg-white transition-all shadow-sm active:shadow-inner"
                    >
                      <ArrowLeft size={14} className="text-neutral-400" />
                      Volver a la lista
                    </motion.button>
                    {isEditingService ? (
                      <input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-2xl font-black text-neutral-800 outline-none focus:border-black"
                        autoFocus
                      />
                    ) : (
                      <h2 className="text-2xl font-black text-neutral-800 tracking-tight leading-tight">
                        {selectedService.title}
                      </h2>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage && !isEditingService && (
                      <button onClick={() => setIsEditingService(true)} className="p-2 rounded-full hover:bg-black hover:text-white text-neutral-400 transition-all shadow-sm bg-white border border-neutral-100">
                        <Edit3 size={18} />
                      </button>
                    )}
                    {isEditingService && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setIsEditingService(false)} className="px-3 py-2 text-xs font-bold uppercase text-neutral-400 hover:text-neutral-600">Cancelar</button>
                        <button onClick={handleSaveService} disabled={isSavingDesc} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-xs font-bold uppercase shadow-md hover:bg-neutral-800">
                          {isSavingDesc ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          Guardar
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => { setSelectedService(null); setShowDetail(false); }}
                      className="p-1 text-neutral-300 hover:text-black transition-colors transform rotate-45"
                    >
                      <ArrowLeft size={22} />
                    </button>
                  </div>
                </div>

                {/* Compact Info Grid */}
                <div className="grid grid-cols-2 gap-4 py-4 border-y border-neutral-100/60">
                  <div className="flex flex-col gap-1.5 relative">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Responsable</span>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-neutral-200 shadow-sm border border-white">
                        {teamMembersMap[selectedService.responsible_id]?.avatar_url ? (
                          <img src={teamMembersMap[selectedService.responsible_id].avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : <User className="w-full h-full p-1.5 text-neutral-400" />}
                      </div>
                      <span className="text-xs font-bold text-neutral-700">{teamMembersMap[selectedService.responsible_id]?.full_name || 'Sin asignar'}</span>
                      {isAdmin && (
                        <button onClick={() => setIsAssigning(!isAssigning)} className="ml-1 p-1 rounded-full text-neutral-300 hover:text-black hover:bg-neutral-100 transition-all">
                          <UserPlus size={12} />
                        </button>
                      )}
                    </div>
                    <AnimatePresence>
                      {isAssigning && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute left-0 top-12 w-48 bg-white rounded-2xl shadow-2xl border border-neutral-100 z-50 p-2 max-h-60 overflow-y-auto">
                          <div className="text-[9px] font-black uppercase text-neutral-400 p-2 border-b mb-1">Asignar a...</div>
                          {allWorkers.map(w => (
                            <button key={w.id} onClick={() => handleAssignResponsible(w.id)} className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-50 text-left">
                              <img src={w.avatar_url || `https://ui-avatars.com/api/?name=${w.full_name}`} className="w-5 h-5 rounded-full" />
                              <span className="text-[11px] font-bold text-neutral-700 truncate">{w.full_name}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Proyecto</span>
                    <span className="self-start px-2 py-0.5 rounded-md bg-rose-50 text-rose-500 font-bold text-[10px] uppercase border border-rose-100/50">{selectedProject?.title || 'DTE'}</span>
                  </div>
                </div>

                {/* Description Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-neutral-800">Descripción</h3>
                  </div>
                  {isEditingService || isEditingDesc ? (
                    <textarea
                      value={editedDesc}
                      onChange={(e) => setEditedDesc(e.target.value)}
                      className="w-full bg-white/50 border border-neutral-200 rounded-xl p-4 text-sm text-neutral-600 outline-none focus:border-black transition-colors min-h-[100px]"
                      placeholder="Describe el servicio..."
                    />
                  ) : (
                    <div className="relative group">
                      <p className="text-sm text-neutral-500 leading-relaxed italic pr-4">
                        {selectedService.description || "Sin descripción asignada."}
                      </p>
                      {canManage && (
                        <button onClick={() => { setIsEditingDesc(true); setIsEditingService(false); }} className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-400 transition-all">
                          <Edit3 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Files Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-neutral-800">Archivos</h3>
                    {canManage && (
                      <>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        <button
                          onClick={() => fileInputRef.current.click()}
                          disabled={isUploading}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-black border border-neutral-100 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all active:scale-95"
                        >
                          {isUploading ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={14} />}
                          Subir
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {files.map(file => (
                      <div key={file.id} className="relative group w-20">
                        <a href={file.file_url} target="_blank" rel="noreferrer" className="block w-20">
                          <div className="w-20 h-24 rounded-2xl bg-white border border-neutral-50 shadow-sm flex flex-col items-center justify-center gap-1 group-hover:bg-neutral-50 transition-all">
                            <FileText size={24} className="text-neutral-500" />
                          </div>
                          <p className="text-[10px] text-center mt-2 font-bold text-neutral-400 truncate w-full px-1">{file.file_name}</p>
                        </a>
                        {isEditingService && (
                          <button
                            onClick={() => handleDeleteFile(file)}
                            className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-all active:scale-90 z-10"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                    {files.length === 0 && (
                      <div className="flex gap-4 opacity-30">
                        {[1, 2].map(i => (
                          <div key={i} className="w-20 flex flex-col items-center">
                            <div className="w-20 h-24 rounded-2xl bg-neutral-200/40 border border-dashed border-neutral-300 flex items-center justify-center">
                              <FileText size={24} className="text-neutral-300" />
                            </div>
                            <p className="text-[9px] mt-2 font-black uppercase tracking-tighter text-neutral-400">Adjunto {i}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments Right View */}
              <div className={`w-full lg:w-[360px] xl:w-[400px] bg-white/40 flex flex-col h-full border-l lg:border-none ${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-5 md:p-6 lg:p-8 pb-4 flex items-center justify-between">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                    <MessageSquare size={14} className="text-skyblue" />
                    Comentarios
                  </h3>
                  <div className="flex md:hidden items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setMobileView('detail')}
                      className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-2 py-1 rounded-md hover:bg-neutral-100"
                    >
                      Detalles
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setMobileView('list')}
                      className="text-[10px] font-black uppercase tracking-widest text-neutral-800 bg-neutral-100 px-3 py-1.5 rounded-md shadow-sm"
                    >
                      Lista
                    </motion.button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 space-y-4 scrollbar-hide py-4" ref={scrollRef}>
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-4 rounded-2xl bg-white border border-neutral-100/60 shadow-sm">
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-neutral-50">
                        <img src={comment.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${comment.profiles?.full_name}`} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-xs font-bold text-neutral-900 truncate">{comment.profiles?.full_name}</span>
                          <span className="text-[9px] text-neutral-400 font-bold whitespace-nowrap">{new Date(comment.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-neutral-500 leading-relaxed">{comment.body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 pt-2">
                  <form onSubmit={handleSendComment} className="flex items-center gap-2 bg-white p-1.5 pl-3 pr-2 rounded-full shadow-lg border border-neutral-50 ring-2 ring-black/5">
                    <input value={newComment} onChange={(e) => setNewComment(e.target.value)} type="text" placeholder="Comentar..." className="flex-1 bg-transparent text-xs outline-none placeholder:text-neutral-400 py-2" />
                    <AnimatePresence>
                      {newComment.trim() && (
                        <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} type="submit" disabled={isSending} className="p-2.5 bg-black text-white rounded-full shadow-lg hover:bg-neutral-800 transition-all flex items-center justify-center shrink-0">
                          {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </form>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-8 text-center bg-white/40">
              <Layers size={64} className="mb-6 opacity-10" />
              <p className="font-bold text-lg">Selecciona un servicio</p>
              <p className="text-xs mt-3 max-w-xs leading-relaxed opacity-60 font-medium">Visualiza detalles, archivos y mantén una conversación fluida con el equipo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectServices;
