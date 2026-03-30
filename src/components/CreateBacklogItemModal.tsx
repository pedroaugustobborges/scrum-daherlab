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
} from "@mui/material";
import { Save, Functions, PersonOutline } from "@mui/icons-material";
import toast from "react-hot-toast";
import Modal from "./Modal";
import { supabase } from "@/lib/supabase";

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

const fibonacciOptions = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

export default function CreateBacklogItemModal({
  open,
  onClose,
  onSuccess,
  item,
}: CreateBacklogItemModalProps) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    story_points: 0,
    project_id: "",
    assigned_to: "",
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
        });
      } else {
        resetForm();
      }
    }
  }, [open, item]);

  // Fetch team members when project changes
  useEffect(() => {
    if (formData.project_id) {
      fetchTeamMembers(formData.project_id);
    } else {
      setTeamMembers([]);
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
    try {
      // Get teams associated with this project
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

      // Get all members of these teams
      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select(`
          user_id,
          profiles:profiles!team_members_user_id_fkey(id, full_name, avatar_url)
        `)
        .in("team_id", teamIds);

      if (membersError) throw membersError;

      // Deduplicate members (a user might be in multiple teams)
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
      const { data: user } = await supabase.auth.getUser();

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
          })
          .eq("id", item.id);

        if (error) throw error;
        toast.success("Item do backlog atualizado com sucesso!");
      } else {
        // Create new item
        const { error } = await supabase.from("tasks").insert([
          {
            title: formData.title,
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            story_points: formData.story_points,
            project_id: formData.project_id,
            assigned_to: formData.assigned_to || null,
            sprint_id: null, // Backlog items have no sprint
            created_by: user.user?.id,
          },
        ]);

        if (error) throw error;
        toast.success("Item adicionado ao backlog com sucesso!");
      }

      onSuccess();
      onClose();
      resetForm();
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
      title={item ? "Editar Item do Backlog" : "Novo Item do Backlog"}
    >
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3} sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Título"
            required
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            autoFocus
          />

          <TextField
            fullWidth
            label="Descrição"
            multiline
            rows={4}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Como um [tipo de usuário], eu quero [ação] para [benefício]..."
          />

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
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <MenuItem value="todo">A Fazer</MenuItem>
                <MenuItem value="in-progress">Em Progresso</MenuItem>
                <MenuItem value="review">Em Revisão</MenuItem>
                <MenuItem value="done">Concluído</MenuItem>
                <MenuItem value="blocked">Bloqueado</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Prioridade"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
              >
                <MenuItem value="low">Baixa</MenuItem>
                <MenuItem value="medium">Média</MenuItem>
                <MenuItem value="high">Alta</MenuItem>
                <MenuItem value="urgent">Urgente</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Responsável"
                value={formData.assigned_to}
                onChange={(e) =>
                  setFormData({ ...formData, assigned_to: e.target.value })
                }
                disabled={!formData.project_id}
                helperText={
                  !formData.project_id
                    ? "Selecione um projeto primeiro"
                    : teamMembers.length === 0
                    ? "Nenhum membro no projeto"
                    : undefined
                }
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
                      <Avatar
                        src={member.avatar_url || undefined}
                        sx={{ width: 24, height: 24, fontSize: 12 }}
                      >
                        {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </Avatar>
                      <Typography variant="body2">
                        {member.full_name}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Box>
            <Typography
              variant="subtitle2"
              fontWeight={600}
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <Functions sx={{ fontSize: 18 }} />
              Story Points (Fibonacci)
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
              {fibonacciOptions.map((points) => (
                <Chip
                  key={points}
                  label={points}
                  onClick={() =>
                    setFormData({ ...formData, story_points: points })
                  }
                  color={
                    formData.story_points === points ? "primary" : "default"
                  }
                  sx={{
                    fontWeight: 700,
                    cursor: "pointer",
                    border:
                      formData.story_points === points
                        ? "2px solid"
                        : "1px solid",
                    borderColor:
                      formData.story_points === points
                        ? "primary.main"
                        : "divider",
                    "&:hover": {
                      borderColor: "primary.main",
                    },
                  }}
                />
              ))}
              <Chip
                label="0"
                onClick={() => setFormData({ ...formData, story_points: 0 })}
                color={formData.story_points === 0 ? "primary" : "default"}
                sx={{
                  fontWeight: 700,
                  cursor: "pointer",
                  border:
                    formData.story_points === 0 ? "2px solid" : "1px solid",
                  borderColor:
                    formData.story_points === 0 ? "primary.main" : "divider",
                  "&:hover": {
                    borderColor: "primary.main",
                  },
                }}
              />
            </Box>
          </Box>

          <Box
            sx={{ display: "flex", gap: 2, justifyContent: "flex-end", pt: 2 }}
          >
            <Button onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
              sx={{ px: 4 }}
            >
              {loading ? "Salvando..." : item ? "Atualizar" : "Criar Item"}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Modal>
  );
}
