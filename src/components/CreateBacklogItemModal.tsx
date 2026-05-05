import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Grid,
  Typography,
  Chip,
  Stack,
  Avatar,
  InputAdornment,
  Autocomplete,
} from "@mui/material";
import {
  Save,
  Functions,
  PersonOutline,
  Assignment,
  Description,
  Flag,
  TrendingUp,
  Person,
  CalendarMonth,
  AccountTree,
  SpaceDashboard,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import Modal from "./Modal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTaskMilestone } from "@/hooks/useTaskMilestone";

interface CreateBacklogItemModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item?: {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    story_points: number;
    project_id: string;
    assigned_to: string;
    due_date?: string;
  };
}

interface Project {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface AvailableTask {
  id: string;
  title: string;
  status: string;
}

const statusOptions = [
  { value: "todo", label: "A Fazer", color: "#6b7280" },
  { value: "in-progress", label: "Em Progresso", color: "#f59e0b" },
  { value: "review", label: "Em Revisão", color: "#8b5cf6" },
  { value: "done", label: "Concluído", color: "#10b981" },
  { value: "blocked", label: "Bloqueado", color: "#ef4444" },
];

const priorityOptions = [
  { value: "low", label: "Baixa", color: "#6b7280" },
  { value: "medium", label: "Média", color: "#f59e0b" },
  { value: "high", label: "Alta", color: "#ef4444" },
  { value: "urgent", label: "Urgente", color: "#dc2626" },
];

const fibonacciOptions = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

export default function CreateBacklogItemModal({
  open,
  onClose,
  onSuccess,
  item,
}: CreateBacklogItemModalProps) {
  const { user } = useAuth();
  const { checkAndNotifyMilestone } = useTaskMilestone();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<AvailableTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedPredecessors, setSelectedPredecessors] = useState<AvailableTask[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    story_points: 0,
    project_id: "",
    assigned_to: "",
    due_date: "",
  });

  useEffect(() => {
    if (open) {
      fetchProjects();
      if (item) {
        setFormData({
          title: item.title || "",
          description: item.description || "",
          status: item.status || "todo",
          priority: item.priority || "medium",
          story_points: item.story_points || 0,
          project_id: item.project_id || "",
          assigned_to: item.assigned_to || "",
          due_date: item.due_date || "",
        });
        // Fetch predecessors for edit mode
        fetchExistingPredecessors(item.id);
      } else {
        resetForm();
        setSelectedPredecessors([]);
      }
    }
  }, [open, item]);

  // Fetch team members and available tasks when project changes
  useEffect(() => {
    if (formData.project_id) {
      fetchTeamMembers(formData.project_id);
      fetchAvailableTasks(formData.project_id);
    } else {
      setTeamMembers([]);
      setAvailableTasks([]);
    }
  }, [formData.project_id]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchTeamMembers = async (projectId: string) => {
    setLoadingMembers(true);
    try {
      const { data: projectTeams, error: teamsError } = await supabase
        .from("project_teams")
        .select("team_id")
        .eq("project_id", projectId);

      if (teamsError) throw teamsError;

      if (!projectTeams || projectTeams.length === 0) {
        setTeamMembers([]);
        return;
      }

      const teamIds = projectTeams.map((pt) => pt.team_id);

      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select(`
          user_id,
          profiles:profiles!team_members_user_id_fkey(id, full_name, avatar_url)
        `)
        .in("team_id", teamIds);

      if (membersError) throw membersError;

      const uniqueMembers = new Map<string, TeamMember>();
      members?.forEach((m) => {
        const profile = m.profiles as unknown as TeamMember;
        if (profile && !uniqueMembers.has(profile.id)) {
          uniqueMembers.set(profile.id, {
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          });
        }
      });

      setTeamMembers(
        Array.from(uniqueMembers.values()).sort((a, b) =>
          a.full_name.localeCompare(b.full_name)
        )
      );
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchAvailableTasks = async (projectId: string) => {
    setLoadingTasks(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status")
        .eq("project_id", projectId)
        // Exclude the item being edited from the list
        .neq("id", item?.id || "")
        .order("title");

      if (error) throw error;
      setAvailableTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchExistingPredecessors = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from("task_dependencies")
        .select("predecessor_id, predecessor:tasks!predecessor_id(id, title, status)")
        .eq("successor_id", taskId);

      if (error) throw error;

      const predecessors = (data || [])
        .map((d: any) => d.predecessor)
        .filter(Boolean) as AvailableTask[];

      setSelectedPredecessors(predecessors);
    } catch (error) {
      console.error("Error fetching predecessors:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      story_points: 0,
      project_id: "",
      assigned_to: "",
      due_date: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (!formData.project_id) {
      toast.error("Projeto é obrigatório");
      return;
    }

    setLoading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();

      if (item) {
        // Update existing item
        const { error } = await supabase
          .from("tasks")
          .update({
            title: formData.title,
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            story_points: formData.story_points,
            project_id: formData.project_id,
            assigned_to: formData.assigned_to || null,
            due_date: formData.due_date || null,
          })
          .eq("id", item.id);

        if (error) throw error;

        // Update dependencies: delete old ones, insert new ones
        await supabase.from("task_dependencies").delete().eq("successor_id", item.id);

        if (selectedPredecessors.length > 0) {
          const dependencies = selectedPredecessors.map((pred) => ({
            predecessor_id: pred.id,
            successor_id: item.id,
            dependency_type: "FS",
            lag_days: 0,
          }));
          const { error: depError } = await supabase
            .from("task_dependencies")
            .insert(dependencies);
          if (depError) console.error("Error updating dependencies:", depError);
        }

        toast.success("Item do backlog atualizado com sucesso!");
      } else {
        // Create new item
        const { data: newTask, error } = await supabase
          .from("tasks")
          .insert([
            {
              title: formData.title,
              description: formData.description,
              status: formData.status,
              priority: formData.priority,
              story_points: formData.story_points,
              project_id: formData.project_id,
              assigned_to: formData.assigned_to || null,
              due_date: formData.due_date || null,
              sprint_id: null,
              created_by: authData.user?.id,
              completed_at: formData.status === "done" ? new Date().toISOString() : null,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        // Create dependencies for selected predecessors
        if (selectedPredecessors.length > 0 && newTask) {
          const dependencies = selectedPredecessors.map((pred) => ({
            predecessor_id: pred.id,
            successor_id: newTask.id,
            dependency_type: "FS",
            lag_days: 0,
          }));
          const { error: depError } = await supabase
            .from("task_dependencies")
            .insert(dependencies);
          if (depError) {
            console.error("Error creating dependencies:", depError);
            toast.error("Item criado, mas erro ao criar dependências");
          }
        }

        // Gamification: task created directly as done and assigned to current user
        if (formData.status === "done" && user && formData.assigned_to === user.id) {
          void checkAndNotifyMilestone(user.id);
        }

        toast.success("Item adicionado ao backlog com sucesso!");
      }

      onSuccess();
      onClose();
      resetForm();
      setSelectedPredecessors([]);
    } catch (error) {
      console.error("Error saving backlog item:", error);
      toast.error("Erro ao salvar item do backlog");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item?.id ? "Editar Item do Backlog" : "Novo Item do Backlog"}
      maxWidth="md"
    >
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3} sx={{ pt: 2 }}>
          {/* Title */}
          <TextField
            fullWidth
            label="Título"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Como um [usuário], eu quero [ação] para [benefício]..."
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Assignment sx={{ color: "#6366f1" }} />
                </InputAdornment>
              ),
            }}
            sx={{ "& .MuiOutlinedInput-root": { fontSize: "1.05rem", fontWeight: 500 } }}
          />

          {/* Description */}
          <TextField
            fullWidth
            label="Descrição"
            multiline
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Critérios de aceitação e detalhes..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 2 }}>
                  <Description sx={{ color: "#6366f1" }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Project + Status */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Projeto"
                required
                value={formData.project_id}
                onChange={(e) =>
                  setFormData({ ...formData, project_id: e.target.value, assigned_to: "" })
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SpaceDashboard sx={{ color: "#6366f1" }} />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">
                  <em>Selecione um projeto</em>
                </MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TrendingUp sx={{ color: "#6366f1" }} />
                    </InputAdornment>
                  ),
                }}
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: option.color }} />
                      {option.label}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Priority + Assignee */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Prioridade"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Flag sx={{ color: "#6366f1" }} />
                    </InputAdornment>
                  ),
                }}
              >
                {priorityOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: option.color }} />
                      {option.label}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Responsável"
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                disabled={!formData.project_id || loadingMembers}
                helperText={
                  !formData.project_id
                    ? "Selecione um projeto primeiro"
                    : teamMembers.length === 0 && !loadingMembers
                    ? "Nenhum membro no projeto"
                    : undefined
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: "#6366f1" }} />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PersonOutline sx={{ fontSize: 24, color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary">
                      Não atribuído
                    </Typography>
                  </Box>
                </MenuItem>
                {teamMembers.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar src={member.avatar_url || undefined} sx={{ width: 24, height: 24, fontSize: 12 }}>
                        {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </Avatar>
                      <Typography variant="body2">{member.full_name}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {/* Due Date */}
          <TextField
            fullWidth
            type="date"
            label="Data de Conclusão"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarMonth sx={{ color: "#6366f1" }} />
                </InputAdornment>
              ),
            }}
            helperText="Data limite para conclusão do item"
          />

          {/* Story Points */}
          <Box>
            <Typography
              variant="subtitle2"
              fontWeight={600}
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <Functions sx={{ fontSize: 18, color: "#6366f1" }} />
              Story Points (Fibonacci)
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
              <Chip
                label="0"
                onClick={() => setFormData({ ...formData, story_points: 0 })}
                color={formData.story_points === 0 ? "primary" : "default"}
                sx={{
                  fontWeight: 700,
                  cursor: "pointer",
                  border: formData.story_points === 0 ? "2px solid" : "1px solid",
                  borderColor: formData.story_points === 0 ? "primary.main" : "divider",
                  "&:hover": { borderColor: "primary.main" },
                }}
              />
              {fibonacciOptions.map((points) => (
                <Chip
                  key={points}
                  label={points}
                  onClick={() => setFormData({ ...formData, story_points: points })}
                  color={formData.story_points === points ? "primary" : "default"}
                  sx={{
                    fontWeight: 700,
                    cursor: "pointer",
                    border: formData.story_points === points ? "2px solid" : "1px solid",
                    borderColor: formData.story_points === points ? "primary.main" : "divider",
                    "&:hover": { borderColor: "primary.main" },
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Predecessors */}
          <Autocomplete
            multiple
            options={availableTasks}
            getOptionLabel={(option) => option.title}
            value={selectedPredecessors}
            onChange={(_, newValue) => setSelectedPredecessors(newValue)}
            loading={loadingTasks}
            disabled={!formData.project_id}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Predecessoras"
                placeholder={
                  !formData.project_id
                    ? "Selecione um projeto primeiro"
                    : "Selecione tarefas que devem ser concluídas antes"
                }
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <AccountTree sx={{ color: "#6366f1" }} />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
                helperText="Tarefas que devem ser concluídas antes desta"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option.id}
                  label={option.title}
                  size="small"
                  sx={{
                    bgcolor: option.status === "done" ? "rgba(16, 185, 129, 0.1)" : "rgba(99, 102, 241, 0.1)",
                    color: option.status === "done" ? "#10b981" : "#6366f1",
                    fontWeight: 500,
                  }}
                />
              ))
            }
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {option.title}
                  </Typography>
                  <Chip
                    label={
                      option.status === "done"
                        ? "Concluída"
                        : option.status === "in-progress"
                        ? "Em Progresso"
                        : "Pendente"
                    }
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.65rem",
                      bgcolor:
                        option.status === "done"
                          ? "#10b98120"
                          : option.status === "in-progress"
                          ? "#f59e0b20"
                          : "#6b728020",
                      color:
                        option.status === "done"
                          ? "#10b981"
                          : option.status === "in-progress"
                          ? "#f59e0b"
                          : "#6b7280",
                    }}
                  />
                </Box>
              </Box>
            )}
          />

          {/* Actions */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              justifyContent: "flex-end",
              pt: 2,
              borderTop: "2px solid",
              borderColor: "rgba(99, 102, 241, 0.1)",
            }}
          >
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={loading}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
                borderWidth: 2,
                borderColor: "rgba(99, 102, 241, 0.3)",
                color: "#6366f1",
                fontWeight: 600,
                "&:hover": {
                  borderWidth: 2,
                  borderColor: "#6366f1",
                  backgroundColor: "rgba(99, 102, 241, 0.05)",
                },
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: "1rem",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              }}
            >
              {loading ? "Salvando..." : item?.id ? "Atualizar" : "Criar Item"}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Modal>
  );
}
