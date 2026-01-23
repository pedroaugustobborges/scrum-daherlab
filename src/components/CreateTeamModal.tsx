import { useState, useEffect, useCallback, useRef } from "react";
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
  Collapse,
  Fade,
} from "@mui/material";
import {
  People,
  Description,
  PersonAdd,
  Delete,
  Badge,
  Save,
  AutoAwesome,
  Check,
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

// AI Name Suggestion Prompt
const AI_PROMPT = `# Role
Você é um especialista em Naming criativo para equipes corporativas no Brasil. Sua função é receber o nome original de um time e a data atual, e transformar esse nome em uma versão divertida e temática, alinhada à festividade mais próxima.

# Input
1. Nome Original do Time
2. Data Atual

# Lógica de Sazonalidade (Prioridade Alta)
Analise a "Data Atual" e aplique o tema correspondente:

1. **Carnaval (Janeiro e Fevereiro)**
   - Estilo: Escolas de Samba, Bloquinhos de Rua, Marchinhas.
   - Padrões: ""Bloco do [Nome]", "Unidos do [Nome]", "Acadêmicos do [Nome]", "Turma do Abadá".
   - Exemplo: "Contratos" -> "Bloco da Contratual 🎭"

2. **Festa Junina (Maio e Junho)**
   - Estilo: Caipira, Sertanejo, Arraiá.
   - Padrões: "Arraiá do [Nome]", "Quadrilha do [Nome]", "Barraca do [Nome]".
   - Exemplo: "Engenharia" -> "Arraiá da Engenharia 🤠"

3. **Férias Escolares de Julho (Julho)**
   - Estilo: Relaxamento, Praia, Pescaria.
   - Padrões: "[Nome] de Férias", "Expedição [Nome]", "Viajantes do [Nome]".
   - Exemplo: "Financeiro" -> "Financeiro no Araguaia 🎣"

4. **Halloween (Outubro)**
   - Estilo: Terror cômico, Fantasias.
   - Padrões: "Maldição do [Nome]", "Coven do [Nome]", "[Nome] Assombrado".
   - Exemplo: "RH" -> "RH do Além 👻"

5. **Natal e Fim de Ano (Dezembro)**
   - Estilo: Natalino, Ano Novo, Confraternização.
   - Padrões: "Papai Noel do [Nome]", "Trenó do [Nome]", "Família [Nome]".
   - Exemplo: "Logística" -> "Expresso Polar da Logística 🎅"

6. **Outras Datas (Default)**
   - Estilo: Cultura Pop, Trocadilhos de escritório, Futurismo.
   - Padrões: "Liga da [Nome]", "Mestres do [Nome]", "[Nome] S.A.".

# Regras de Output
- Mantenha o humor leve e adequado ao ambiente de trabalho (safe for work).
- Use sempre um emoji no final correspondente ao tema.
- O nome deve ser curto e fácil de ler.
- Retorne APENAS o nome sugerido, sem explicações.`;

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
  // Helper para o título sazonal
  const getSeasonalTitle = () => {
    const month = new Date().getMonth(); // 0 = Janeiro, 11 = Dezembro
    // Carnaval (Janeiro e Fevereiro)

    if (month === 0 || month === 1) {
      return "Que tal um nome de time pronto para o Carnaval?";
    } // Festa Junina (Maio e Junho)
    if (month === 4 || month === 5) {
      return "Que tal um nome de time pronto para as festas juninas?";
    } // Férias (Julho)
    if (month === 6) {
      return "Que tal um nome de time pronto para as férias escolares?";
    } // Halloween (Outubro)
    if (month === 9) {
      return "Que tal um nome de time pronto para o Halloween?";
    } // Fim de Ano (Dezembro)
    if (month === 11) {
      return "Que tal um nome de time pronto para as festas de fim de ano?";
    } // Default

    return "Que tal o nome?";
  };
  // AI Suggestion State
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [suggestionSelected, setSuggestionSelected] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Function to call DeepSeek API
  const fetchAISuggestion = useCallback(async (teamName: string) => {
    if (!teamName.trim() || teamName.length < 3) {
      setAiSuggestion("");
      return;
    }

    setLoadingSuggestion(true);
    setSuggestionSelected(false);

    try {
      const currentDate = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: AI_PROMPT },
              {
                role: "user",
                content: `Nome Original do Time: ${teamName}\nData Atual: ${currentDate}`,
              },
            ],
            max_tokens: 100,
            temperature: 0.8,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch AI suggestion");
      }

      const data = await response.json();
      const suggestion = data.choices?.[0]?.message?.content?.trim() || "";
      setAiSuggestion(suggestion);
    } catch (error) {
      console.error("Error fetching AI suggestion:", error);
      setAiSuggestion("");
    } finally {
      setLoadingSuggestion(false);
    }
  }, []);

  // Debounced name change handler
  const handleNameChangeWithAI = useCallback(
    (name: string) => {
      setFormData((prev) => ({ ...prev, name }));
      setSuggestionSelected(false);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer (800ms)
      debounceTimerRef.current = setTimeout(() => {
        fetchAISuggestion(name);
      }, 800);
    },
    [fetchAISuggestion],
  );

  // Handle selecting the AI suggestion
  const handleSelectSuggestion = () => {
    if (aiSuggestion) {
      setFormData((prev) => ({ ...prev, name: aiSuggestion }));
      setSuggestionSelected(true);
      setAiSuggestion("");
    }
  };

  // Handle keeping the original name
  const handleKeepOriginal = () => {
    setAiSuggestion("");
    setSuggestionSelected(false);
  };

  useEffect(() => {
    if (open) {
      fetchProfiles();
      // Reset form
      setFormData({ name: "", description: "" });
      setSelectedMembers([]);
      setSelectedUserId("");
      setSelectedRole("developer");
      setAiSuggestion("");
      setSuggestionSelected(false);
    }

    // Cleanup debounce timer
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
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
    (p) => !selectedMembers.some((m) => m.userId === p.id),
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
          <Box>
            <TextField
              fullWidth
              label="Nome do Time"
              value={formData.name}
              onChange={(e) => handleNameChangeWithAI(e.target.value)}
              required
              placeholder="Ex: Time de Desenvolvimento Backend"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <People sx={{ color: "#6366f1" }} />
                  </InputAdornment>
                ),
                endAdornment: loadingSuggestion ? (
                  <InputAdornment position="end">
                    <CircularProgress size={20} sx={{ color: "#8b5cf6" }} />
                  </InputAdornment>
                ) : suggestionSelected ? (
                  <InputAdornment position="end">
                    <AutoAwesome sx={{ color: "#8b5cf6", fontSize: 20 }} />
                  </InputAdornment>
                ) : null,
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "1.1rem",
                  fontWeight: 500,
                },
              }}
            />

            {/* AI Suggestion Card */}
            <Collapse in={!!aiSuggestion && !suggestionSelected}>
              <Fade in={!!aiSuggestion}>
                <Box
                  sx={{
                    mt: 2,
                    p: 2.5,
                    borderRadius: 3,
                    background:
                      "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)",
                    border: "2px solid rgba(139, 92, 246, 0.3)",
                    position: "relative",
                    overflow: "hidden",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background:
                        "linear-gradient(90deg, #8b5cf6 0%, #6366f1 50%, #8b5cf6 100%)",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 2s infinite linear",
                    },
                    "@keyframes shimmer": {
                      "0%": { backgroundPosition: "200% 0" },
                      "100%": { backgroundPosition: "-200% 0" },
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    <AutoAwesome
                      sx={{
                        color: "#8b5cf6",
                        fontSize: 18,
                        animation: "pulse 2s infinite",
                        "@keyframes pulse": {
                          "0%, 100%": { opacity: 1 },
                          "50%": { opacity: 0.5 },
                        },
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#8b5cf6",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {getSeasonalTitle()}
                    </Typography>
                  </Box>

                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "#1f2937",
                      mb: 2,
                      fontSize: "1.25rem",
                    }}
                  >
                    {aiSuggestion}
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Check />}
                      onClick={handleSelectSuggestion}
                      sx={{
                        background:
                          "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                        borderRadius: 2,
                        px: 2.5,
                        py: 1,
                        fontWeight: 600,
                        textTransform: "none",
                        boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
                        "&:hover": {
                          background:
                            "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                          boxShadow: "0 6px 16px rgba(139, 92, 246, 0.4)",
                        },
                      }}
                    >
                      Usar este nome
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleKeepOriginal}
                      sx={{
                        borderColor: "rgba(139, 92, 246, 0.5)",
                        color: "#8b5cf6",
                        borderRadius: 2,
                        px: 2.5,
                        py: 1,
                        fontWeight: 600,
                        textTransform: "none",
                        "&:hover": {
                          borderColor: "#8b5cf6",
                          bgcolor: "rgba(139, 92, 246, 0.08)",
                        },
                      }}
                    >
                      Manter original
                    </Button>
                  </Box>
                </Box>
              </Fade>
            </Collapse>

            {/* Helper text */}
            {formData.name.length >= 3 &&
              !aiSuggestion &&
              !loadingSuggestion &&
              !suggestionSelected && (
                <Typography
                  variant="caption"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    mt: 1,
                    color: "text.secondary",
                  }}
                >
                  <AutoAwesome sx={{ fontSize: 14 }} />
                  Digite o nome do time para receber uma sugestão divertida da
                  IA
                </Typography>
              )}
          </Box>

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
