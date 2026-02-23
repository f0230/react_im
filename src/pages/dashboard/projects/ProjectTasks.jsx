import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingFallback from '@/components/ui/LoadingFallback';
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
  Trash2,
  Calendar,
  AlertCircle,
  DollarSign,
  ClipboardList
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import FigmaComments from '@/components/projects/FigmaComments';

// Figma logo inline SVG component
function FigmaLogo({ size = 14, className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size * (38 / 57)} height={size} viewBox="0 0 38 57" fill="none" className={className}>
      <path d="M19 28.5C19 25.9861 20.0009 23.5752 21.7825 21.7936C23.5641 20.0121 25.975 19.0112 28.4889 19.0112H38V28.5H28.4889C25.975 28.5 23.5641 29.5009 21.7825 31.2825C20.0009 33.0641 19 35.475 19 37.9889V47.5C19 50.0139 17.9991 52.4248 16.2175 54.2064C14.4359 55.9879 12.025 56.9888 9.51111 56.9888C6.99725 56.9888 4.58636 55.9879 2.80481 54.2064C1.02326 52.4248 0.022421 50.0139 0.022421 47.5C0.022421 44.9861 1.02326 42.5752 2.80481 40.7936C4.56408 39.0121 6.99725 38.0112 9.51111 38.0112H19V28.5Z" fill="#1ABCFE" />
      <path d="M0 9.5C0 6.98614 1.00089 4.57522 2.78249 2.79363C4.56408 1.01205 6.975 0.0112247 9.48889 0.0112247H19V19H9.48889C6.975 19 4.56408 17.9991 2.78249 16.2175C1.00089 14.4359 0 12.025 0 9.5Z" fill="#F24E1E" />
      <path d="M19 0.0112247H28.5111C31.025 0.0112247 33.4359 1.01205 35.2175 2.79363C36.9991 4.57522 38 6.98614 38 9.5C38 12.0139 36.9991 14.4248 35.2175 16.2064C33.4359 17.9879 31.025 18.9888 28.5111 18.9888H19V0.0112247Z" fill="#FF7262" />
      <path d="M0 28.5C0 25.9861 1.00089 23.5752 2.78249 21.7936C4.56408 20.0121 6.975 19.0112 9.48889 19.0112H19V38H9.48889C6.975 38 4.56408 36.9991 2.78249 35.2175C1.00089 33.4359 0 31.025 0 28.5Z" fill="#A259FF" />
      <path d="M19 19H28.5111C31.025 19 33.4359 20.0009 35.2175 21.7825C36.9991 23.5641 38 25.975 38 28.4889C38 31.0028 36.9991 33.4137 35.2175 35.1952C33.4359 36.9768 31.025 37.9777 28.5111 37.9777H19V19Z" fill="#1ABCFE" />
    </svg>
  );
}

// Figma Jam logo inline SVG
function JamLogo({ size = 14, className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect width="32" height="32" rx="8" fill="#A259FF" />
      <rect x="10" y="10" width="12" height="12" rx="1" fill="white" />
    </svg>
  );
}

// Google Drive logo inline SVG
function DriveLogo({ size = 14, className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size * (443 / 512)} viewBox="0 0 512 443" fill="none" className={className}>
      <path d="M165 0h182l165 282H347z" fill="#FFBA00" />
      <path d="M0 282L83 443h330L330 282z" fill="#2196F3" />
      <path d="M165 0L0 282l83 161 165-281z" fill="#00AC47" />
    </svg>
  );
}

const ProjectTasks = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryProjectId = searchParams.get('projectId');
  const queryServiceId = searchParams.get('serviceId');
  const { user, profile, client } = useAuth();

  // State
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list', 'detail', 'comments', 'figma'
  const [chatMode, setChatMode] = useState('internal'); // 'internal', 'figma'

  const [loading, setLoading] = useState(true);
  const [serviceLoading, setServiceLoading] = useState(false);

  // Detail Data
  const [comments, setComments] = useState([]);
  const [files, setFiles] = useState([]);
  const [teamMembersMap, setTeamMembersMap] = useState({});
  const [allWorkers, setAllWorkers] = useState([]);

  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Management Helpers
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedDesc, setEditedDesc] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [editedFields, setEditedFields] = useState({
    deadline: '',
    priority: 'medium',
    budget: '',
    deliverables: '',
    requirements: ''
  });
  const [replacingFile, setReplacingFile] = useState(null);
  const [deletingFileId, setDeletingFileId] = useState(null);

  // UI Helpers
  const [isCreateServiceOpen, setIsCreateServiceOpen] = useState(false);
  const [newServiceTitle, setNewServiceTitle] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isEditingService, setIsEditingService] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const createInputRef = useRef(null);
  const actionsRef = useRef(null);

  const isAdmin = profile?.role === 'admin';
  const isWorker = profile?.role === 'worker';
  const canManage = isAdmin || isWorker;

  // Close actions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setIsActionsOpen(false);
        setIsAssigning(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Fetch Projects
  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    let response;

    if (isAdmin) {
      response = await supabase
        .from('projects')
        .select('*, project_assignments(worker_id), project_clients(client_id, clients(id, full_name, company_name)), project_client_users(user_id, profiles(id, full_name))')
        .order('created_at', { ascending: false });
    } else if (isWorker) {
      const { data: assignments } = await supabase
        .from('project_assignments')
        .select('project_id')
        .eq('worker_id', user.id);
      const projectIds = assignments?.map(a => a.project_id) || [];
      if (projectIds.length === 0) {
        response = { data: [] };
      } else {
        response = await supabase
          .from('projects')
          .select('*, project_assignments(worker_id), project_clients(client_id, clients(id, full_name, company_name)), project_client_users(user_id, profiles(id, full_name))')
          .in('id', projectIds)
          .order('created_at', { ascending: false });
      }
    } else if (profile?.role === 'client') {
      const { data: clientUserAssignmentsData } = await supabase
        .from('project_client_users')
        .select('project_id')
        .eq('user_id', user.id);

      const assignedByUserId = clientUserAssignmentsData?.map((a) => a.project_id) || [];

      let assignedByClientId = [];
      const effectiveClientId = client?.id || profile?.client_id;

      if (effectiveClientId) {
        const { data: companyAssignmentsData } = await supabase
          .from('project_clients')
          .select('project_id')
          .eq('client_id', effectiveClientId);

        assignedByClientId = companyAssignmentsData?.map((a) => a.project_id) || [];
      }

      const allAssignedProjectIds = Array.from(new Set([...assignedByUserId, ...assignedByClientId]));

      let query = supabase
        .from('projects')
        .select('*, project_assignments(worker_id), project_clients(client_id, clients(id, full_name, company_name)), project_client_users(user_id, profiles(id, full_name))')
        .order('created_at', { ascending: false });

      const filters = [];
      filters.push(`user_id.eq.${user.id}`);

      if (effectiveClientId) {
        filters.push(`client_id.eq.${effectiveClientId}`);
      }

      if (allAssignedProjectIds.length > 0) {
        filters.push(`id.in.(${allAssignedProjectIds.join(',')})`);
      }

      query = query.or(filters.join(','));
      response = await query;
    } else {
      response = await supabase
        .from('projects')
        .select('*, project_assignments(worker_id), project_clients(client_id, clients(id, full_name, company_name)), project_client_users(user_id, profiles(id, full_name))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
    }

    if (!response.error && response.data) {
      setProjects(response.data);
      let active = queryProjectId ? response.data.find(p => p.id === queryProjectId) : (response.data[0] || null);
      if (active) setSelectedProject(active);
    } else if (response.error) {
      console.error("Error fetching projects:", response.error);
    }
    setLoading(false);
  }, [user?.id, profile?.role, client?.id, queryProjectId, isAdmin, isWorker, navigate]);

  // 2. Fetch Services
  const fetchServices = useCallback(async (projectId) => {
    if (!projectId) return;
    setServiceLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setServices(data);
      if (queryServiceId) {
        const target = data.find(s => s.id === queryServiceId);
        if (target) {
          setSelectedService(target);
          setShowDetail(true);
        }
      }
    }
    setServiceLoading(false);
  }, [queryServiceId]);

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
    if (!canManage) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .in('role', ['admin', 'worker']);
    if (data) setAllWorkers(data);
  }, [canManage]);

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
  }, [selectedProject, fetchServices, fetchTeamMemberProfiles, queryServiceId]);

  useEffect(() => {
    if (selectedService?.id) {
      fetchServiceDetails(selectedService.id);
      setEditedDesc(selectedService.description || '');
      setEditedTitle(selectedService.title || '');
      setEditedFields({
        deadline: selectedService.deadline ? new Date(selectedService.deadline).toISOString().split('T')[0] : '',
        priority: selectedService.priority || 'medium',
        budget: selectedService.budget || '',
        deliverables: selectedService.deliverables || '',
        requirements: selectedService.requirements || ''
      });
      setIsEditingDesc(false);
      setIsEditingService(false);
      setIsActionsOpen(false);
      setIsAssigning(false);
      setMobileView('detail');
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

  const handleToggleStatus = async (serviceId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'active' : 'completed';
    const { error } = await supabase
      .from('services')
      .update({ status: newStatus })
      .eq('id', serviceId);

    if (!error) {
      if (selectedService?.id === serviceId) {
        setSelectedService(prev => ({ ...prev, status: newStatus }));
      }
      setServices(prev => prev.map(s => s.id === serviceId ? { ...s, status: newStatus } : s));
    } else {
      console.error('Error updating status:', error.message);
    }
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
      console.error('Error updating description:', error.message);
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
        description: editedDesc.trim(),
        deadline: editedFields.deadline || null,
        priority: editedFields.priority,
        budget: editedFields.budget,
        deliverables: editedFields.deliverables,
        requirements: editedFields.requirements
      })
      .eq('id', selectedService.id);

    if (!error) {
      const updatedService = {
        ...selectedService,
        title: editedTitle.trim(),
        description: editedDesc.trim(),
        ...editedFields
      };
      setSelectedService(updatedService);
      setServices(prev => prev.map(s => s.id === selectedService.id ? updatedService : s));
      setIsEditingService(false);
      setIsActionsOpen(false);
    } else {
      console.error('Error saving service:', error.message);
      alert(`Error al guardar: ${error.message}`);
    }
    setIsSavingDesc(false);
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm('¿Estás seguro de eliminar este archivo?')) return;

    setDeletingFileId(file.id);

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
    setDeletingFileId(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedService) return;
    // Reset input so same file can be re-uploaded
    e.target.value = '';

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
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
    } else {
      console.error('Upload error:', uploadError);
      alert(`Error al subir archivo: ${uploadError.message}`);
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
      setIsActionsOpen(false);
      if (workerId && !teamMembersMap[workerId]) fetchTeamMemberProfiles([workerId]);
    } else {
      console.error('Error assigning responsible:', error.message);
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
        description: '',
      })
      .select()
      .single();

    if (!error && data) {
      setServices(prev => [data, ...prev]);
      setNewServiceTitle('');
      setIsCreateServiceOpen(false);
      setSelectedService(data);
      setShowDetail(true);
    } else if (error) {
      console.error('Error creating service:', error);
      alert(`Error al crear tarea: ${error.message}`);
    }
  };

  const handleCreateServiceKeyDown = (e) => {
    if (e.key === 'Enter') handleCreateService();
    if (e.key === 'Escape') { setIsCreateServiceOpen(false); setNewServiceTitle(''); }
  };

  const projectTeam = useMemo(() => {
    const ids = selectedProject?.project_assignments?.map(pa => pa.worker_id) || [];
    return ids.map(id => teamMembersMap[id]).filter(Boolean);
  }, [selectedProject, teamMembersMap]);

  const completedCount = useMemo(() => services.filter(s => s.status === 'completed').length, [services]);
  const totalCount = services.length;

  const getProjectInitials = (project) => {
    const title = project?.title || project?.name || project?.project_name || 'DTE';
    const words = title.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
    return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
  };

  // File preview/icon based on type
  const renderFilePreview = (file) => {
    const type = file.file_type;
    const url = file.file_url;

    if (type?.startsWith('image/')) {
      return (
        <div className="w-full h-full relative overflow-hidden bg-neutral-50 flex items-center justify-center">
          <img
            src={url}
            alt={file.file_name}
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:blur-[1px]"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-lg">
              <Download size={14} className="text-white" />
            </div>
          </div>
        </div>
      );
    }

    if (type?.includes('pdf')) return <div className="flex flex-col items-center gap-1.5"><span className="text-4xl transition-transform group-hover:scale-110 drop-shadow-sm">📄</span><span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter bg-rose-50 px-1.5 py-0.5 rounded-md">PDF</span></div>;
    if (type?.includes('zip') || type?.includes('rar')) return <div className="flex flex-col items-center gap-1.5"><span className="text-4xl transition-transform group-hover:scale-110 drop-shadow-sm">🗜️</span><span className="text-[9px] font-black text-amber-600 uppercase tracking-tighter bg-amber-50 px-1.5 py-0.5 rounded-md">ZIP</span></div>;
    if (type?.includes('word') || type?.includes('doc')) return <div className="flex flex-col items-center gap-1.5"><span className="text-4xl transition-transform group-hover:scale-110 drop-shadow-sm">📝</span><span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter bg-blue-50 px-1.5 py-0.5 rounded-md">DOC</span></div>;
    if (type?.includes('sheet') || type?.includes('excel') || type?.includes('csv')) return <div className="flex flex-col items-center gap-1.5"><span className="text-4xl transition-transform group-hover:scale-110 drop-shadow-sm">📊</span><span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-1.5 py-0.5 rounded-md">XLS</span></div>;

    return <FileText size={32} className="text-neutral-200 transition-all group-hover:scale-110 group-hover:text-neutral-400" />;
  };

  if (loading) {
    return <LoadingFallback type="spinner" />;
  }

  if (!loading && projects.length === 0) {
    return (
      <div className="font-product min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
          <Briefcase size={28} className="text-neutral-300" />
        </div>
        <h2 className="text-xl font-black text-neutral-700 mb-2">No hay proyectos</h2>
        <p className="text-sm text-neutral-400 mb-6 max-w-xs leading-relaxed">
          Aún no tenés proyectos asignados. Creá uno para comenzar a gestionar tareas.
        </p>
        <button
          onClick={() => navigate('/dashboard/projects')}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-bold rounded-full hover:bg-neutral-800 transition-all shadow-md"
        >
          <ArrowLeft size={14} /> Ir a Proyectos
        </button>
      </div>
    );
  }

  return (
    <div className="font-product min-h-screen md:min-h-[calc(100vh-140px)] max-w-[1500px] mx-auto w-full px-2 md:px-8 flex flex-col justify-center py-2 md:py-8 overflow-hidden">
      <div className="flex flex-col md:flex-row gap-4 lg:gap-6 h-[calc(100vh-80px)] md:h-[650px] lg:h-[750px] overflow-hidden w-full relative">

        {/* LEFT COLUMN - SERVICE LIST */}
        <div className={`w-full md:w-[320px] lg:w-[360px] flex flex-col bg-white rounded-[24px] md:rounded-[32px] border border-neutral-100 shadow-sm overflow-hidden h-full shrink-0 transition-all ${mobileView !== 'list' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 bg-neutral-100/50 border-b border-neutral-100 flex flex-col items-center text-center relative">
            {/* Back button */}
            <button
              onClick={() => navigate('/dashboard/projects')}
              className="absolute left-4 top-4 p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-all text-neutral-500 hover:text-black"
              title="Volver a proyectos"
            >
              <ArrowLeft size={16} />
            </button>

            {/* Project switcher if multiple projects */}
            {projects.length > 1 && (
              <div className="absolute right-4 top-4">
                <button
                  onClick={() => setIsProjectSwitcherOpen(v => !v)}
                  className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-all text-neutral-500 hover:text-black"
                  title="Cambiar proyecto"
                >
                  <Briefcase size={14} />
                </button>
                <AnimatePresence>
                  {isProjectSwitcherOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      className="absolute right-0 top-10 w-56 bg-white rounded-2xl shadow-2xl border border-neutral-100 z-50 p-2 max-h-64 overflow-y-auto"
                    >
                      <div className="text-[9px] font-black uppercase text-neutral-400 px-2 py-1.5 border-b mb-1">Proyectos</div>
                      {projects.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedProject(p); setSelectedService(null); setShowDetail(false); setIsProjectSwitcherOpen(false); }}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${selectedProject?.id === p.id ? 'bg-black text-white' : 'hover:bg-neutral-50 text-neutral-700'
                            }`}
                        >
                          <div className={`w-7 h-7 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-black ${selectedProject?.id === p.id ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'
                            }`}>
                            {p.profile_image_url ? (
                              <img src={p.profile_image_url} alt="" className="w-full h-full object-cover" />
                            ) : getProjectInitials(p)}
                          </div>
                          <span className="text-[12px] font-bold truncate">{p.title || p.name || 'Proyecto'}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Project avatar */}
            <div className="w-20 h-20 md:w-24 md:h-24 mb-3 rounded-full bg-gradient-to-br from-lime-400 to-emerald-600 shadow-lg flex items-center justify-center text-2xl font-black text-black overflow-hidden">
              {selectedProject?.profile_image_url || selectedProject?.avatar_url ? (
                <img src={selectedProject.profile_image_url || selectedProject.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-black text-lg font-black">{getProjectInitials(selectedProject)}</span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-black text-neutral-800 tracking-tight leading-tight">
              {selectedProject?.title || selectedProject?.name || selectedProject?.project_name || 'Proyecto'}
            </h2>

            {/* Task progress badge */}
            {totalCount > 0 && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${completedCount === totalCount ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                  {completedCount}/{totalCount} completadas
                </span>
              </div>
            )}

            {/* Team avatars */}
            <div className="mt-3 flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Equipo</span>
              <div className="flex items-center -space-x-2">
                {projectTeam.length > 0 ? projectTeam.slice(0, 5).map((member, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-white shadow-sm overflow-hidden" title={member.full_name}>
                    <img src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name || 'U')}`} alt="" className="w-full h-full object-cover" />
                  </div>
                )) : (
                  <div className="w-7 h-7 rounded-full border-2 border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center">
                    <User size={10} className="text-neutral-300" />
                  </div>
                )}
                {projectTeam.length > 5 && (
                  <div className="w-7 h-7 rounded-full border-2 border-white bg-neutral-100 flex items-center justify-center text-[9px] font-black text-neutral-500">
                    +{projectTeam.length - 5}
                  </div>
                )}
              </div>
            </div>

            {/* Project Links Section */}
            {(selectedProject?.figma_url || selectedProject?.jam_url || selectedProject?.drive_url) && (
              <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
                {selectedProject.figma_url && (
                  <a
                    href={selectedProject.figma_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white/50 hover:bg-white rounded-full transition-all text-neutral-600 hover:text-black border border-white/20 shadow-sm"
                    title="Figma Design"
                  >
                    <FigmaLogo size={12} />
                    <span className="text-[9px] font-black uppercase tracking-wide">Diseño</span>
                  </a>
                )}
                {selectedProject.jam_url && (
                  <a
                    href={selectedProject.jam_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white/50 hover:bg-white rounded-full transition-all text-neutral-600 hover:text-black border border-white/20 shadow-sm"
                    title="Figma Jam"
                  >
                    <JamLogo size={12} />
                    <span className="text-[9px] font-black uppercase tracking-wide">FigJam</span>
                  </a>
                )}
                {selectedProject.drive_url && (
                  <a
                    href={selectedProject.drive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white/50 hover:bg-white rounded-full transition-all text-neutral-600 hover:text-black border border-white/20 shadow-sm"
                    title="Google Drive"
                  >
                    <DriveLogo size={12} />
                    <span className="text-[9px] font-black uppercase tracking-wide">Drive</span>
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-[#EBEBEB]">
            <div className="p-5 md:p-6 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-neutral-800">Tareas</h3>
                <p className="text-[9px] md:text-[10px] text-neutral-500 uppercase tracking-wide">Seguimiento en curso</p>
              </div>
              {canManage && (
                <button onClick={() => setIsCreateServiceOpen(!isCreateServiceOpen)} className="p-2 rounded-full bg-black text-white hover:bg-neutral-800 transition-all shadow-md">
                  {isCreateServiceOpen ? <X size={14} /> : <Plus size={14} />}
                </button>
              )}
            </div>

            <AnimatePresence>
              {isCreateServiceOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 md:px-6 pb-3 overflow-hidden"
                >
                  <div className="flex gap-2 bg-white rounded-2xl p-1 shadow-sm border border-neutral-100">
                    <input
                      ref={createInputRef}
                      value={newServiceTitle}
                      onChange={(e) => setNewServiceTitle(e.target.value)}
                      onKeyDown={handleCreateServiceKeyDown}
                      type="text"
                      placeholder="Nombre de la tarea..."
                      autoFocus
                      className="flex-1 px-3 py-2 bg-transparent text-sm focus:outline-none text-neutral-800 placeholder:text-neutral-400"
                    />
                    <button
                      onClick={handleCreateService}
                      disabled={!newServiceTitle.trim()}
                      className="px-4 py-2 bg-black text-white text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 transition-all shrink-0"
                    >
                      Crear
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1.5 px-1">Presiona Enter para crear · Esc para cancelar</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto px-5 md:px-6 py-4 space-y-2 scrollbar-hide">
              {serviceLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-neutral-300" />
                </div>
              ) : services.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-200/40 flex items-center justify-center mb-3">
                    <Layers size={20} className="text-neutral-300" />
                  </div>
                  <p className="text-sm font-bold text-neutral-400">Sin tareas aún</p>
                  <p className="text-[11px] text-neutral-400 mt-1 mb-4 max-w-[180px] leading-relaxed">Crea la primera tarea para este proyecto</p>
                  {canManage && (
                    <button
                      onClick={() => { setIsCreateServiceOpen(true); setTimeout(() => createInputRef.current?.focus(), 100); }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-bold rounded-full hover:bg-neutral-800 transition-all shadow-md"
                    >
                      <Plus size={12} /> Nueva tarea
                    </button>
                  )}
                </div>
              ) : (
                services.map(s => (
                  <motion.div
                    key={s.id}
                    layout
                    onClick={() => {
                      setSelectedService(s);
                      setShowDetail(true);
                      setMobileView('detail');
                    }}
                    className={`group p-4 rounded-xl cursor-pointer transition-all border flex items-center justify-between ${selectedService?.id === s.id
                      ? 'bg-black/5 border-black/10'
                      : 'bg-white/50 border-white/40 hover:bg-white hover:shadow-sm'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(s.id, s.status);
                        }}
                        className={`shrink-0 p-1 rounded-md transition-all ${s.status === 'completed' ? 'text-emerald-500' : 'text-neutral-300 hover:text-neutral-400'
                          }`}
                      >
                        {s.status === 'completed' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`font-bold text-sm truncate ${s.status === 'completed' ? 'text-neutral-400 line-through' : 'text-neutral-800'
                            }`}>{s.title}</span>
                          {s.responsible_id && teamMembersMap[s.responsible_id] && (
                            <div
                              className="w-5 h-5 rounded-full overflow-hidden border border-white shadow-sm shrink-0"
                              title={`Responsable: ${teamMembersMap[s.responsible_id].full_name}`}
                            >
                              <img
                                src={teamMembersMap[s.responsible_id].avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(teamMembersMap[s.responsible_id].full_name || 'U')}`}
                                className="w-full h-full object-cover"
                                alt=""
                              />
                            </div>
                          )}
                        </div>
                        {s.status === 'completed' && (
                          <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wide">Completada</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className={`shrink-0 ${selectedService?.id === s.id ? 'text-black' : 'text-neutral-300 group-hover:text-black'
                      }`} />
                  </motion.div>
                ))
              )}
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
                {selectedProject?.figma_url && (
                  <button
                    onClick={() => setMobileView('figma')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mobileView === 'figma' ? 'bg-black text-white shadow-md' : 'text-neutral-400'}`}
                  >
                    Figma
                  </button>
                )}
              </div>

              {/* Detail Info Panel */}
              <div className={`flex-1 flex flex-col border-r border-neutral-200/40 p-5 md:p-6 lg:p-8 space-y-6 overflow-y-auto scrollbar-hide ${mobileView === 'comments' ? 'hidden lg:flex' : 'flex'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Back Button for mobile */}
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
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleStatus(selectedService.id, selectedService.status)}
                          className={`p-1 rounded-md transition-all shrink-0 ${selectedService.status === 'completed' ? 'text-emerald-500' : 'text-neutral-300 hover:text-neutral-400'}`}
                        >
                          {selectedService.status === 'completed' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                        </button>
                        <h2 className={`text-xl md:text-2xl font-black tracking-tight leading-tight truncate ${selectedService.status === 'completed' ? 'text-neutral-400 line-through' : 'text-neutral-800'}`}>
                          {selectedService.title}
                        </h2>
                      </div>
                    )}
                  </div>

                  {/* Unified Actions Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isEditingService ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setIsEditingService(false); setIsActionsOpen(false); }} className="px-3 py-2 text-xs font-bold uppercase text-neutral-400 hover:text-neutral-600">Cancelar</button>
                        <button onClick={handleSaveService} disabled={isSavingDesc} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-xs font-bold uppercase shadow-md hover:bg-neutral-800">
                          {isSavingDesc ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          Guardar
                        </button>
                      </div>
                    ) : canManage ? (
                      <div ref={actionsRef} className="relative">
                        <button
                          onClick={() => { setIsActionsOpen(v => !v); setIsAssigning(false); }}
                          className="p-2 rounded-full hover:bg-black hover:text-white text-neutral-400 transition-all shadow-sm bg-white border border-neutral-100"
                          title="Más opciones"
                        >
                          <MoreVertical size={18} />
                        </button>
                        <AnimatePresence>
                          {isActionsOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -5 }}
                              className="absolute right-0 top-10 w-52 bg-white rounded-2xl shadow-2xl border border-neutral-100 z-50 p-2 overflow-hidden"
                            >
                              {/* Edit title/desc */}
                              <button
                                onClick={() => { setIsEditingService(true); setIsActionsOpen(false); }}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-50 text-left transition-all"
                              >
                                <Edit3 size={14} className="text-neutral-500 shrink-0" />
                                <span className="text-xs font-bold text-neutral-700">Editar tarea</span>
                              </button>

                              {/* Assign responsible */}
                              <button
                                onClick={() => setIsAssigning(v => !v)}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-50 text-left transition-all"
                              >
                                <UserPlus size={14} className="text-neutral-500 shrink-0" />
                                <span className="text-xs font-bold text-neutral-700">Asignar responsable</span>
                              </button>

                              {/* Upload file */}
                              <button
                                onClick={() => { fileInputRef.current?.click(); setIsActionsOpen(false); }}
                                disabled={isUploading}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-50 text-left transition-all disabled:opacity-50"
                              >
                                {isUploading ? <Loader2 size={14} className="animate-spin text-neutral-500 shrink-0" /> : <UploadCloud size={14} className="text-neutral-500 shrink-0" />}
                                <span className="text-xs font-bold text-neutral-700">Subir archivo</span>
                              </button>

                              {/* Workers sub-list for assigning */}
                              <AnimatePresence>
                                {isAssigning && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-t border-neutral-100 mt-1 pt-1"
                                  >
                                    <div className="text-[9px] font-black uppercase text-neutral-400 px-2 py-1.5">Asignar a...</div>
                                    <div className="max-h-40 overflow-y-auto">
                                      {allWorkers.map(w => (
                                        <button key={w.id} onClick={() => handleAssignResponsible(w.id)} className={`w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-neutral-50 text-left transition-all ${selectedService.responsible_id === w.id ? 'bg-emerald-50' : ''}`}>
                                          <img src={w.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.full_name || 'U')}`} className="w-6 h-6 rounded-full shrink-0" alt="" />
                                          <span className="text-xs font-bold text-neutral-700 truncate">{w.full_name}</span>
                                          {selectedService.responsible_id === w.id && <CheckCircle2 size={12} className="text-emerald-500 ml-auto shrink-0" />}
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Compact Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-neutral-100/60">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Responsable</span>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-neutral-200 shadow-sm border border-white shrink-0">
                        {teamMembersMap[selectedService.responsible_id]?.avatar_url ? (
                          <img src={teamMembersMap[selectedService.responsible_id].avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : <User className="w-full h-full p-1.5 text-neutral-400" />}
                      </div>
                      <span className="text-xs font-bold text-neutral-700 truncate">{teamMembersMap[selectedService.responsible_id]?.full_name || 'Sin asignar'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Entrega</span>
                    {isEditingService ? (
                      <input
                        type="date"
                        value={editedFields.deadline}
                        onChange={(e) => setEditedFields(prev => ({ ...prev, deadline: e.target.value }))}
                        className="text-xs font-bold text-neutral-700 bg-white border border-neutral-100 rounded px-1.5 py-0.5 outline-none focus:border-black"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-neutral-400" />
                        <span className="text-xs font-bold text-neutral-700">
                          {selectedService.deadline ? new Date(selectedService.deadline).toLocaleDateString() : 'Sin fecha'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Prioridad</span>
                    {isEditingService ? (
                      <select
                        value={editedFields.priority}
                        onChange={(e) => setEditedFields(prev => ({ ...prev, priority: e.target.value }))}
                        className="text-[10px] font-bold text-neutral-700 bg-white border border-neutral-100 rounded px-1.5 py-0.5 outline-none focus:border-black"
                      >
                        <option value="low">BAJA</option>
                        <option value="medium">MEDIA</option>
                        <option value="high">ALTA</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <AlertCircle size={12} className={
                          selectedService.priority === 'high' ? 'text-rose-500' :
                            selectedService.priority === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                        } />
                        <span className={`text-[10px] font-black uppercase ${selectedService.priority === 'high' ? 'text-rose-500' :
                          selectedService.priority === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                          }`}>
                          {selectedService.priority === 'high' ? 'Alta' :
                            selectedService.priority === 'medium' ? 'Media' : 'Baja'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Presupuesto</span>
                    {isEditingService ? (
                      <input
                        type="text"
                        placeholder="$0.00"
                        value={editedFields.budget}
                        onChange={(e) => setEditedFields(prev => ({ ...prev, budget: e.target.value }))}
                        className="text-xs font-bold text-neutral-700 bg-white border border-neutral-100 rounded px-1.5 py-0.5 outline-none focus:border-black"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <DollarSign size={12} className="text-neutral-400" />
                        <span className="text-xs font-bold text-neutral-700">{selectedService.budget || 'N/A'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-neutral-800">Descripción</h3>
                  </div>
                  {isEditingService || isEditingDesc ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedDesc}
                        onChange={(e) => setEditedDesc(e.target.value)}
                        className="w-full bg-white/50 border border-neutral-200 rounded-xl p-4 text-sm text-neutral-600 outline-none focus:border-black transition-colors min-h-[100px]"
                        placeholder="Describe la tarea..."
                      />
                      {isEditingDesc && !isEditingService && (
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setIsEditingDesc(false)} className="px-3 py-1.5 text-xs font-bold text-neutral-400 hover:text-neutral-600">Cancelar</button>
                          <button onClick={handleUpdateDescription} disabled={isSavingDesc} className="flex items-center gap-1.5 px-4 py-1.5 bg-black text-white rounded-lg text-xs font-bold hover:bg-neutral-800 disabled:opacity-50">
                            {isSavingDesc ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            Guardar
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="relative group cursor-text"
                      onClick={canManage ? () => { setIsEditingDesc(true); setIsEditingService(false); } : undefined}
                    >
                      <p className="text-sm text-neutral-500 leading-relaxed italic pr-4">
                        {selectedService.description || "Sin descripción. Haz clic para agregar una."}
                      </p>
                      {canManage && (
                        <span className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-neutral-200 text-neutral-400 transition-all pointer-events-none">
                          <Edit3 size={12} />
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Requirements & Deliverables Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardList size={14} className="text-neutral-400" />
                      <h3 className="text-sm font-bold text-neutral-800">Requerimientos</h3>
                    </div>
                    {isEditingService ? (
                      <textarea
                        value={editedFields.requirements}
                        onChange={(e) => setEditedFields(prev => ({ ...prev, requirements: e.target.value }))}
                        className="w-full bg-white/50 border border-neutral-200 rounded-xl p-3 text-xs text-neutral-600 outline-none focus:border-black transition-colors min-h-[80px]"
                        placeholder="Qué necesitamos del cliente..."
                      />
                    ) : (
                      <p className="text-xs text-neutral-500 leading-relaxed min-h-[40px]">
                        {selectedService.requirements || "Sin requerimientos definidos."}
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={14} className="text-neutral-400" />
                      <h3 className="text-sm font-bold text-neutral-800">Entregables</h3>
                    </div>
                    {isEditingService ? (
                      <textarea
                        value={editedFields.deliverables}
                        onChange={(e) => setEditedFields(prev => ({ ...prev, deliverables: e.target.value }))}
                        className="w-full bg-white/50 border border-neutral-200 rounded-xl p-3 text-xs text-neutral-600 outline-none focus:border-black transition-colors min-h-[80px]"
                        placeholder="Qué se va a entregar..."
                      />
                    ) : (
                      <p className="text-xs text-neutral-500 leading-relaxed min-h-[40px]">
                        {selectedService.deliverables || "Sin entregables definidos."}
                      </p>
                    )}
                  </div>
                </div>

                {/* Files Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-neutral-800">
                      Archivos {files.length > 0 && <span className="text-neutral-400 font-normal">({files.length})</span>}
                    </h3>
                    {canManage && (
                      <>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        <input type="file" ref={replaceInputRef} onChange={handleFileUpload} className="hidden" />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-black border border-neutral-100 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isUploading ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={14} />}
                          Subir
                        </button>
                      </>
                    )}
                  </div>

                  {files.length === 0 && !isUploading ? (
                    <div
                      onClick={canManage ? () => fileInputRef.current?.click() : undefined}
                      className={`flex flex-col items-center justify-center py-8 rounded-2xl border-2 border-dashed border-neutral-200 bg-white/40 text-neutral-400 transition-all ${canManage ? 'cursor-pointer hover:border-neutral-400 hover:bg-white/60' : ''}`}
                    >
                      <UploadCloud size={28} className="mb-2 opacity-30" />
                      <p className="text-xs font-bold">Sin archivos adjuntos</p>
                      {canManage && <p className="text-[10px] mt-1 opacity-60">Haz clic para subir un archivo</p>}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {isUploading && (
                        <div className="w-20 flex flex-col items-center">
                          <div className="w-20 h-24 rounded-2xl bg-white border border-neutral-100 border-dashed flex items-center justify-center animate-pulse">
                            <Loader2 size={20} className="animate-spin text-neutral-300" />
                          </div>
                          <p className="text-[9px] mt-2 text-neutral-400 font-bold">Subiendo...</p>
                        </div>
                      )}
                      {files.map(file => (
                        <div key={file.id} className="relative group w-24">
                          <a href={file.file_url} target="_blank" rel="noreferrer" className="block w-24" title={file.file_name}>
                            <div className={`w-24 h-28 rounded-2xl bg-white border border-neutral-100 shadow-sm flex flex-col items-center justify-center overflow-hidden transition-all group-hover:shadow-md group-hover:border-neutral-200 ${deletingFileId === file.id ? 'opacity-50' : ''}`}>
                              {renderFilePreview(file)}
                            </div>
                            <p className="text-[10px] text-center mt-2.5 font-bold text-neutral-400 truncate w-full px-1 group-hover:text-black transition-colors">{file.file_name}</p>
                          </a>
                          {/* Delete button - always visible for managers */}
                          {canManage && (
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteFile(file); }}
                              disabled={deletingFileId === file.id}
                              className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 hover:bg-rose-600 transition-all active:scale-90 disabled:opacity-50 z-10"
                              title="Eliminar archivo"
                            >
                              {deletingFileId === file.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Comments Right View */}
              <div className={`w-full lg:w-[360px] xl:w-[400px] bg-white/40 flex flex-col h-full border-l lg:border-none ${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-5 md:p-6 lg:p-8 pb-4 flex items-center justify-between">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                    <MessageSquare size={14} className="text-skyblue" />
                    Comentarios
                  </h3>
                  {selectedProject?.figma_url && (
                    <div className="flex bg-neutral-200/50 p-0.5 rounded-lg ml-4">
                      <button
                        onClick={() => setChatMode('internal')}
                        className={`px-2 py-1 text-[9px] font-black uppercase tracking-tight rounded-md transition-all ${chatMode === 'internal' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                      >
                        Tarea
                      </button>
                      <button
                        onClick={() => setChatMode('figma')}
                        className={`px-2 py-1 text-[9px] font-black uppercase tracking-tight rounded-md transition-all ${chatMode === 'figma' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                      >
                        Figma
                      </button>
                    </div>
                  )}
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

                <div className="flex-1 overflow-hidden relative">
                  {chatMode === 'figma' && selectedProject?.figma_url ? (
                    <div className="h-full">
                      <FigmaComments figmaUrl={selectedProject.figma_url} />
                    </div>
                  ) : (
                    <>
                      <div className="h-full flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 space-y-4 scrollbar-hide py-4 pb-12" ref={scrollRef}>
                          {comments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-8">
                              <MessageSquare size={32} className="mb-3" />
                              <p className="text-xs font-bold">Sin comentarios aún</p>
                              <p className="text-[10px] mt-1">Sé el primero en comentar</p>
                            </div>
                          ) : comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3 p-4 rounded-2xl bg-white border border-neutral-100/60 shadow-sm">
                              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-neutral-50">
                                <img src={comment.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.profiles?.full_name || 'U')}`} className="w-full h-full object-cover" alt="" />
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
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-8 text-center bg-white/40">
              <Layers size={64} className="mb-6 opacity-10" />
              <p className="font-bold text-lg">Selecciona una tarea</p>
              <p className="text-xs mt-3 max-w-xs leading-relaxed opacity-60 font-medium">Visualiza detalles, archivos y mantén una conversación fluida con el equipo.</p>
            </div>
          )}
        </div>
      </div>
    </div >
  );
};

export default ProjectTasks;
