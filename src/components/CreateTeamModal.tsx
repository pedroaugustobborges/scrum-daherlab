import { useState, useEffect } from "react";
import {
  TextField,
  Button,
  MenuItem,
  Box,
  Stack,
  InputAdornment,
  CircularProgress,
  Typography,
  IconButton,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from "@mui/material";
import {
  People,
  Description,
  PersonAdd,
  Delete,
  Badge,
  Save,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import Modal from "./Modal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface CreateTeamModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Profile {
  id: string;
  full_name: string;
}

interface SelectedMember {
  userId: string;
  userName: string;
  role: string;
}

const roleOptions = [
  { value: "product_owner", label: "Product Owner", color: "#6366f1" },
  { value: "scrum_master", label: "Scrum Master", color: "#8b5cf6" },
  { value: "developer", label: "Developer", color: "#10b981" },
  { value: "member", label: "Membro", color: "#6b7280" },
];

export default function CreateTeamModal({
  open,
  onClose,
  onSuccess,
}: CreateTeamModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("developer");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (open) {
      fetchProfiles();
      // Reset form
      setFormData({ name: "", description: "" });
      setSelectedMembers([]);
      setSelectedUserId("");
      setSelectedRole("developer");
    }
  }, [open]);

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddMember = () => {
    if (!selectedUserId) {
      toast.error("Por favor, selecione um usuário");
      return;
    }

    // Check if already added
    if (selectedMembers.some((m) => m.userId === selectedUserId)) {
      toast.error("Este usuário já foi adicionado");
      return;
    }

    const profile = profiles.find((p) => p.id === selectedUserId);
    if (!profile) return;

    setSelectedMembers((prev) => [
      ...prev,
      {
        userId: selectedUserId,
        userName: profile.full_name || "Sem nome",
        role: selectedRole,
      },
    ]);

    setSelectedUserId("");
    setSelectedRole("developer");
  };

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.userId !== userId));
  };

  const getRoleConfig = (role: string) => {
    return roleOptions.find((r) => r.value === role) || roleOptions[3];
  };

  const availableProfiles = profiles.filter(
    (p) => !selectedMembers.some((m) => m.userId === p.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Por favor, informe o nome do time");
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error("Por favor, adicione pelo menos um membro ao time");
      return;
    }

    setLoading(true);

    try {
      // Create team
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .insert([
          {
            name: formData.name,
            description: formData.description,
            created_by: user?.id,
          },
        ])
        .select("id")
        .single();

      if (teamError) throw teamError;

      // Add members to team
      const memberInserts = selectedMembers.map((member) => ({
        team_id: teamData.id,
        user_id: member.userId,
        role: member.role,
      }));

      const { error: membersError } = await supabase
        .from("team_members")
        .insert(memberInserts);

      if (membersError) throw membersError;

      toast.success("Time criado com sucesso!");
      setFormData({
        name: "",
        description: "",
      });
      setSelectedMembers([]);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating team:", error);
      toast.error("Erro ao criar time");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Criar Novo Time" maxWidth="md">
      <form onSubmit={handleSubmit}>
        <Stack spacing={3} sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Nome do Time"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            placeholder="Ex: Time de Desenvolvimento Backend"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <People sx={{ color: "#6366f1" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                fontSize: "1.1rem",
                fontWeight: 500,
              },
            }}
          />

          <TextField
            fullWidth
            label="Descrição"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            multiline
            rows={3}
            placeholder="Descreva as responsabilidades e foco do time..."
            InputProps={{
              startAdornment: (
                <InputAdornment
                  position="start"
                  sx={{ alignSelf: "flex-start", mt: 2 }}
                >
                  <Description sx={{ color: "#6366f1" }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Members Section */}
          <Box
            sx={{
              p: 3,
              borderRadius: 3,
              border: "2px solid",
              borderColor:
                selectedMembers.length === 0
                  ? "error.light"
                  : "rgba(99, 102, 241, 0.2)",
              bgcolor:
                selectedMembers.length === 0
                  ? "rgba(239, 68, 68, 0.03)"
                  : "rgba(99, 102, 241, 0.03)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                Membros do Time *
              </Typography>
              <Chip
                label={`${selectedMembers.length} membro${
                  selectedMembers.length !== 1 ? "s" : ""
                }`}
                size="small"
                color={selectedMembers.length === 0 ? "error" : "primary"}
                sx={{ fontWeight: 600 }}
              />
            </Box>

            {selectedMembers.length === 0 ? (
              <Box
                sx={{
                  textAlign: "center",
                  py: 2,
                  px: 3,
                  mb: 2,
                  borderRadius: 2,
                  bgcolor: "rgba(239, 68, 68, 0.05)",
                  border: "1px dashed rgba(239, 68, 68, 0.3)",
                }}
              >
                <Typography variant="body2" color="error">
                  Adicione pelo menos um membro para criar o time
                </Typography>
              </Box>
            ) : (
              <List
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 2,
                  p: 0,
                  mb: 2,
                }}
              >
                {selectedMembers.map((member, index) => {
                  const roleConfig = getRoleConfig(member.role);
                  return (
                    <Box key={member.userId}>
                      <ListItem
                        sx={{
                          py: 1.5,
                          "&:hover": {
                            bgcolor: "rgba(99, 102, 241, 0.05)",
                          },
                        }}
                      >
                        <Avatar
                          sx={{
                            mr: 2,
                            bgcolor: roleConfig.color,
                            width: 36,
                            height: 36,
                            fontSize: "0.9rem",
                          }}
                        >
                          {member.userName?.charAt(0) || "U"}
                        </Avatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={600}>
                              {member.userName}
                            </Typography>
                          }
                          secondary={
                            <Chip
                              label={roleConfig.label}
                              size="small"
                              sx={{
                                mt: 0.5,
                                bgcolor: `${roleConfig.color}20`,
                                color: roleConfig.color,
                                fontWeight: 600,
                                fontSize: "0.7rem",
                                height: 22,
                              }}
                              icon={<Badge sx={{ fontSize: 12 }} />}
                            />
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleRemoveMember(member.userId)}
                            sx={{
                              color: "error.main",
                              "&:hover": {
                                bgcolor: "rgba(239, 68, 68, 0.1)",
                              },
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < selectedMembers.length - 1 && <Divider />}
                    </Box>
                  );
                })}
              </List>
            )}

            {/* Add Member Form */}
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
              <TextField
                select
                label="Usuário"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loadingProfiles || availableProfiles.length === 0}
                size="small"
                sx={{ flex: 1, minWidth: 150 }}
              >
                {loadingProfiles ? (
                  <MenuItem disabled>Carregando...</MenuItem>
                ) : availableProfiles.length === 0 ? (
                  <MenuItem disabled>
                    Todos os usuários já foram adicionados
                  </MenuItem>
                ) : (
                  availableProfiles.map((profile) => (
                    <MenuItem key={profile.id} value={profile.id}>
                      {profile.full_name || "Sem nome"}
                    </MenuItem>
                  ))
                )}
              </TextField>

              <TextField
                select
                label="Função"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                size="small"
                sx={{ minWidth: 150 }}
              >
                {roleOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: option.color,
                        }}
                      />
                      {option.label}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>

              <Button
                variant="outlined"
                onClick={handleAddMember}
                disabled={!selectedUserId}
                sx={{
                  minWidth: 44,
                  height: 40,
                  p: 0,
                  borderColor: "#6366f1",
                  color: "#6366f1",
                  "&:hover": {
                    borderColor: "#6366f1",
                    bgcolor: "rgba(99, 102, 241, 0.1)",
                  },
                }}
              >
                <PersonAdd />
              </Button>
            </Box>
          </Box>

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
              disabled={loading || selectedMembers.length === 0}
              startIcon={
                loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Save />
                )
              }
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: "1rem",
              }}
            >
              {loading ? "Criando..." : "Criar Time"}
            </Button>
          </Box>
        </Stack>
      </form>
    </Modal>
  );
}
