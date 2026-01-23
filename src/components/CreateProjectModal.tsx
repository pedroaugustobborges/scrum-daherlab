import { useState, useEffect, useRef, useCallback } from "react";
import {
  TextField,
  Button,
  MenuItem,
  Box,
  Stack,
  InputAdornment,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Chip,
  Typography,
  Checkbox,
  ListItemText,
  LinearProgress,
  IconButton,
} from "@mui/material";
import {
  Assignment,
  CalendarToday,
  Description,
  TrendingUp,
  Groups,
  CloudUpload,
  CheckCircle,
  Error as ErrorIcon,
  Close,
  Image as ImageIcon,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import Modal from "./Modal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface Team {
  id: string;
  name: string;
}

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadStatus = "idle" | "dragging" | "uploading" | "success" | "error";

const statusOptions = [
  { value: "active", label: "Ativo", color: "#10b981" },
  { value: "on-hold", label: "Em Espera", color: "#f59e0b" },
  { value: "completed", label: "Concluído", color: "#6366f1" },
  { value: "archived", label: "Arquivado", color: "#6b7280" },
];

export default function CreateProjectModal({
  open,
  onClose,
  onSuccess,
}: CreateProjectModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active",
    start_date: "",
    end_date: "",
  });

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch teams when modal opens
  useEffect(() => {
    if (open) {
      fetchTeams();
    }
  }, [open]);

  // Cleanup image preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const fetchTeams = async () => {
    setTeamsLoading(true);
    try {
      // Fetch teams where the current user is a member
      const { data: userTeamMembers, error: memberError } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user?.id);

      if (memberError) throw memberError;

      const userTeamIds = userTeamMembers?.map((tm) => tm.team_id) || [];

      if (userTeamIds.length === 0) {
        // If user is not a member of any team, show all teams
        const { data: allTeams, error: teamsError } = await supabase
          .from("teams")
          .select("id, name")
          .order("name");

        if (teamsError) throw teamsError;
        setTeams(allTeams || []);
      } else {
        // Show teams where user is a member
        const { data: userTeams, error: teamsError } = await supabase
          .from("teams")
          .select("id, name")
          .in("id", userTeamIds)
          .order("name");

        if (teamsError) throw teamsError;
        setTeams(userTeams || []);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast.error("Erro ao carregar times");
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Image upload handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadStatus("dragging");
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadStatus("idle");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadStatus("idle");

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Formato inválido. Use JPG, PNG, GIF ou WebP.");
      setUploadStatus("error");
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Arquivo muito grande. Máximo 2MB.");
      setUploadStatus("error");
      return;
    }

    // Clear previous preview
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(previewUrl);
    setUploadStatus("success");
    setUploadError(null);
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    setUploadStatus("idle");
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImageToStorage = async (projectId: string): Promise<string | null> => {
    if (!imageFile) return null;

    setUploadStatus("uploading");
    setUploadProgress(0);

    try {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${projectId}/process-map-${Date.now()}.${fileExt}`;

      // Simulate progress (since Supabase doesn't provide real-time progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 20, 90));
      }, 200);

      const { data, error } = await supabase.storage
        .from("project-images")
        .upload(fileName, imageFile, {
          cacheControl: "3600",
          upsert: true,
        });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) throw error;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("project-images")
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      setUploadStatus("error");
      setUploadError("Erro ao fazer upload da imagem");
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Por favor, informe o nome do projeto");
      return;
    }

    setLoading(true);

    try {
      // Create the project first
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert([
          {
            name: formData.name,
            description: formData.description,
            status: formData.status,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            created_by: user?.id,
          },
        ])
        .select("id")
        .single();

      if (projectError) throw projectError;

      // Upload image if selected
      let mappingProcessUrl = null;
      if (imageFile && projectData?.id) {
        mappingProcessUrl = await uploadImageToStorage(projectData.id);

        // Update project with image URL
        if (mappingProcessUrl) {
          const { error: updateError } = await supabase
            .from("projects")
            .update({ mapping_process_url: mappingProcessUrl })
            .eq("id", projectData.id);

          if (updateError) {
            console.error("Error updating project with image URL:", updateError);
          }
        }
      }

      // If teams are selected, create project_teams associations
      if (selectedTeams.length > 0 && projectData?.id) {
        const projectTeamsData = selectedTeams.map((teamId) => ({
          project_id: projectData.id,
          team_id: teamId,
        }));

        const { error: projectTeamsError } = await supabase
          .from("project_teams")
          .insert(projectTeamsData);

        if (projectTeamsError) {
          console.error("Error creating project teams:", projectTeamsError);
          // Don't throw - project was created successfully
          toast.error("Projeto criado, mas houve erro ao associar times");
        }
      }

      toast.success("Projeto criado com sucesso!");
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Erro ao criar projeto");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      status: "active",
      start_date: "",
      end_date: "",
    });
    setSelectedTeams([]);
    handleRemoveImage();
  };

  const getDropzoneStyles = () => {
    const baseStyles = {
      border: "2px dashed",
      borderRadius: 3,
      p: 3,
      textAlign: "center" as const,
      cursor: "pointer",
      transition: "all 0.3s ease",
      position: "relative" as const,
      overflow: "hidden",
    };

    switch (uploadStatus) {
      case "dragging":
        return {
          ...baseStyles,
          borderColor: "#6366f1",
          bgcolor: "rgba(99, 102, 241, 0.1)",
          transform: "scale(1.02)",
        };
      case "success":
        return {
          ...baseStyles,
          borderColor: "#10b981",
          bgcolor: "rgba(16, 185, 129, 0.05)",
        };
      case "error":
        return {
          ...baseStyles,
          borderColor: "#ef4444",
          bgcolor: "rgba(239, 68, 68, 0.05)",
        };
      case "uploading":
        return {
          ...baseStyles,
          borderColor: "#6366f1",
          bgcolor: "rgba(99, 102, 241, 0.05)",
        };
      default:
        return {
          ...baseStyles,
          borderColor: "rgba(99, 102, 241, 0.3)",
          bgcolor: "rgba(99, 102, 241, 0.02)",
          "&:hover": {
            borderColor: "#6366f1",
            bgcolor: "rgba(99, 102, 241, 0.05)",
          },
        };
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Criar Novo Projeto"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack spacing={3} sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Nome do Projeto"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            placeholder="Ex: Sistema de Gestão Financeira"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Assignment sx={{ color: "#6366f1" }} />
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
            rows={4}
            placeholder="Descreva os objetivos e escopo do projeto..."
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

          {/* Process Map Upload Section */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <ImageIcon sx={{ color: "#6366f1", fontSize: 20 }} />
              <Typography variant="body2" fontWeight={600} color="text.secondary">
                Mapa de Processos
              </Typography>
              <Chip
                label="Opcional"
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  bgcolor: "rgba(107, 114, 128, 0.1)",
                  color: "#6b7280",
                }}
              />
            </Box>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileInputChange}
              style={{ display: "none" }}
            />

            {!imagePreview ? (
              <Box
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={getDropzoneStyles()}
              >
                {uploadStatus === "uploading" ? (
                  <Box>
                    <CircularProgress size={40} sx={{ color: "#6366f1", mb: 2 }} />
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                      Fazendo upload...
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={uploadProgress}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: "rgba(99, 102, 241, 0.1)",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: "#6366f1",
                          borderRadius: 3,
                        },
                      }}
                    />
                  </Box>
                ) : uploadStatus === "error" ? (
                  <Box>
                    <ErrorIcon sx={{ fontSize: 40, color: "#ef4444", mb: 1 }} />
                    <Typography variant="body2" color="error" fontWeight={600}>
                      {uploadError}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Clique para tentar novamente
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: "50%",
                        bgcolor: "rgba(99, 102, 241, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 2,
                        transition: "all 0.3s",
                        ...(uploadStatus === "dragging" && {
                          bgcolor: "rgba(99, 102, 241, 0.2)",
                          transform: "scale(1.1)",
                        }),
                      }}
                    >
                      <CloudUpload
                        sx={{
                          fontSize: 30,
                          color: "#6366f1",
                          transition: "all 0.3s",
                          ...(uploadStatus === "dragging" && {
                            transform: "translateY(-3px)",
                          }),
                        }}
                      />
                    </Box>
                    <Typography variant="body1" fontWeight={600} gutterBottom>
                      {uploadStatus === "dragging"
                        ? "Solte a imagem aqui"
                        : "Arraste e solte uma imagem"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ou clique para selecionar
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 1 }}
                    >
                      JPG, PNG, GIF ou WebP (máx. 2MB)
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Box
                sx={{
                  position: "relative",
                  borderRadius: 3,
                  overflow: "hidden",
                  border: "2px solid rgba(16, 185, 129, 0.3)",
                  bgcolor: "rgba(16, 185, 129, 0.02)",
                }}
              >
                {/* Success indicator */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    bgcolor: "rgba(16, 185, 129, 0.9)",
                    color: "white",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    zIndex: 2,
                  }}
                >
                  <CheckCircle sx={{ fontSize: 16 }} />
                  <Typography variant="caption" fontWeight={600}>
                    Imagem selecionada
                  </Typography>
                </Box>

                {/* Remove button */}
                <IconButton
                  onClick={handleRemoveImage}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    bgcolor: "rgba(0, 0, 0, 0.6)",
                    color: "white",
                    zIndex: 2,
                    "&:hover": {
                      bgcolor: "rgba(239, 68, 68, 0.9)",
                    },
                  }}
                >
                  <Close />
                </IconButton>

                {/* Image preview */}
                <Box
                  sx={{
                    p: 2,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Box
                    component="img"
                    src={imagePreview}
                    alt="Preview do mapa de processos"
                    sx={{
                      maxWidth: "100%",
                      maxHeight: 250,
                      objectFit: "contain",
                      borderRadius: 2,
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </Box>

                {/* File info */}
                <Box
                  sx={{
                    p: 2,
                    borderTop: "1px solid rgba(16, 185, 129, 0.2)",
                    bgcolor: "rgba(16, 185, 129, 0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <ImageIcon sx={{ fontSize: 18, color: "#10b981" }} />
                    <Typography variant="body2" fontWeight={500}>
                      {imageFile?.name}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {imageFile && (imageFile.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>
              </Box>
            )}

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              Faça upload de um diagrama ou fluxograma do processo do projeto.
            </Typography>
          </Box>

          <Box>
            <TextField
              fullWidth
              select
              label="Status"
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
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
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: option.color,
                      }}
                    />
                    {option.label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Team Selection */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Groups sx={{ color: "#6366f1", fontSize: 20 }} />
              <Typography variant="body2" fontWeight={600} color="text.secondary">
                Times Responsáveis
              </Typography>
            </Box>
            <FormControl fullWidth>
              <InputLabel
                id="teams-select-label"
                sx={{
                  "&.Mui-focused": { color: "#6366f1" },
                }}
              >
                Selecione os times
              </InputLabel>
              <Select
                labelId="teams-select-label"
                multiple
                value={selectedTeams}
                onChange={(e) => setSelectedTeams(e.target.value as string[])}
                input={<OutlinedInput label="Selecione os times" />}
                disabled={teamsLoading}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {(selected as string[]).map((value) => {
                      const team = teams.find((t) => t.id === value);
                      return (
                        <Chip
                          key={value}
                          label={team?.name || value}
                          size="small"
                          onDelete={() => {
                            setSelectedTeams((prev) =>
                              prev.filter((id) => id !== value)
                            );
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          sx={{
                            bgcolor: "rgba(99, 102, 241, 0.1)",
                            color: "#6366f1",
                            fontWeight: 600,
                            "& .MuiChip-deleteIcon": {
                              color: "#6366f1",
                              "&:hover": {
                                color: "#4f46e5",
                              },
                            },
                          }}
                        />
                      );
                    })}
                  </Box>
                )}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 300,
                    },
                  },
                }}
                sx={{
                  borderRadius: 2,
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#6366f1",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#6366f1",
                  },
                }}
              >
                {teamsLoading ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Carregando times...
                  </MenuItem>
                ) : teams.length === 0 ? (
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                      Nenhum time disponível
                    </Typography>
                  </MenuItem>
                ) : (
                  teams.map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      <Checkbox
                        checked={selectedTeams.indexOf(team.id) > -1}
                        sx={{
                          color: "#6366f1",
                          "&.Mui-checked": {
                            color: "#6366f1",
                          },
                        }}
                      />
                      <ListItemText primary={team.name} />
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              Selecione os times que serão responsáveis por este projeto.
              Somente membros destes times terão acesso ao projeto.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              type="date"
              label="Data de Início"
              value={formData.start_date}
              onChange={(e) => handleChange("start_date", e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarToday sx={{ color: "#6366f1", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              type="date"
              label="Data de Término"
              value={formData.end_date}
              onChange={(e) => handleChange("end_date", e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarToday sx={{ color: "#6366f1", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              inputProps={{
                min: formData.start_date,
              }}
            />
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
              disabled={loading}
              startIcon={
                loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Assignment />
                )
              }
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: "1rem",
              }}
            >
              {loading ? "Criando..." : "Criar Projeto"}
            </Button>
          </Box>
        </Stack>
      </form>
    </Modal>
  );
}
