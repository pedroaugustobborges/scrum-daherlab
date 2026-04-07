import { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  TextField,
  Fab,
  Zoom,
  Avatar,
  CircularProgress,
  alpha,
  useTheme,
  Tooltip,
  Collapse,
  Chip,
  Divider,
  Badge,
} from "@mui/material";
import {
  Close,
  Send,
  Mic,
  MicOff,
  AutoAwesome,
  VolumeUp,
  VolumeOff,
  Minimize,
  OpenInFull,
  Psychology,
} from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// Ada API endpoint
// - Production (Vercel): uses /api/ada-chat serverless function to avoid CORS
// - Development: uses n8n URL directly (n8n allows localhost CORS)
const ADA_API_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_ADA_WEBHOOK_URL || "https://pedroaugustobborges.app.n8n.cloud/webhook/ada-assistant")
  : "/api/ada-chat";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "text" | "email_sent" | "clarification" | "error" | "answer" | "chat";
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface TaskData {
  id: string;
  title: string;
  status: string;
  priority: string;
  story_points: number | null;
  assigned_to_name: string | null;
  sprint_name: string | null;
  due_date: string | null;
}

interface AdaChatbotProps {
  projectId: string;
  projectName: string;
}

export default function AdaChatbot({
  projectId,
  projectName,
}: AdaChatbotProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const { user } = useAuth();

  // State
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projectTasks, setProjectTasks] = useState<TaskData[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Fetch team members for the project (without email column to avoid 400 error)
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!projectId) return;

      try {
        // Get teams associated with this project via sprints
        const { data: sprints } = await supabase
          .from("sprints")
          .select("team_id")
          .eq("project_id", projectId);

        const teamIds = [...new Set(sprints?.map((s) => s.team_id) || [])];

        if (teamIds.length === 0) {
          // Try to get project teams directly
          const { data: projectTeams } = await supabase
            .from("project_teams")
            .select("team_id")
            .eq("project_id", projectId);

          if (projectTeams) {
            teamIds.push(...projectTeams.map((pt) => pt.team_id));
          }
        }

        if (teamIds.length === 0) return;

        // Get team members with their profiles (without email - it may not exist)
        const { data: members, error } = await supabase
          .from("team_members")
          .select(
            `
            user_id,
            role,
            profiles:profiles!team_members_user_id_fkey(
              id,
              full_name
            )
          `,
          )
          .in("team_id", teamIds);

        if (error) {
          console.error("Error fetching team members:", error);
          return;
        }

        if (members) {
          // Now fetch emails from auth.users via profiles if email column exists
          // Otherwise, we'll leave email empty
          const formattedMembers: TeamMember[] = members.map((m: any) => ({
            id: m.profiles?.id || m.user_id,
            full_name: m.profiles?.full_name || "Membro",
            email: "", // Will try to fetch separately
            role: m.role,
          }));

          // Remove duplicates
          const uniqueMembers = formattedMembers.filter(
            (member, index, self) =>
              index === self.findIndex((m) => m.id === member.id),
          );

          // Try to get emails if the column exists
          try {
            const userIds = uniqueMembers.map((m) => m.id);
            const { data: profilesWithEmail } = await supabase
              .from("profiles")
              .select("id, email")
              .in("id", userIds);

            if (profilesWithEmail) {
              uniqueMembers.forEach((member) => {
                const profileWithEmail = profilesWithEmail.find(
                  (p) => p.id === member.id,
                );
                if (profileWithEmail?.email) {
                  member.email = profileWithEmail.email;
                }
              });
            }
          } catch {
            // Email column doesn't exist, that's fine
            console.log("Email column not available in profiles");
          }

          setTeamMembers(uniqueMembers);
        }
      } catch (error) {
        console.error("Error fetching team members:", error);
      }
    };

    fetchTeamMembers();
  }, [projectId]);

  // Fetch project tasks for context
  useEffect(() => {
    const fetchProjectTasks = async () => {
      if (!projectId) return;

      try {
        const { data: tasks, error } = await supabase
          .from("tasks")
          .select(
            `
            id,
            title,
            status,
            priority,
            story_points,
            due_date,
            assigned_to,
            profiles:profiles!tasks_assigned_to_fkey(full_name),
            sprints:sprints!tasks_sprint_id_fkey(name)
          `,
          )
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) {
          console.error("Error fetching tasks:", error);
          return;
        }

        if (tasks) {
          const formattedTasks: TaskData[] = tasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            story_points: t.story_points,
            assigned_to_name: t.profiles?.full_name || null,
            sprint_name: t.sprints?.name || null,
            due_date: t.due_date,
          }));
          setProjectTasks(formattedTasks);
        }
      } catch (error) {
        console.error("Error fetching project tasks:", error);
      }
    };

    fetchProjectTasks();
  }, [projectId]);

  // Fetch current user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) return;

      // Get user email from the auth user object
      setUserEmail(user.email || "");

      // Get full name from profiles
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUserName(profile.full_name || "");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserInfo();
  }, [user]);

  // Initialize speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "pt-BR";

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Welcome message when opening chat
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: "welcome",
        role: "assistant",
        content: `Olá! Sou a Ada, sua assistente inteligente e vou te ajudar aqui com o projeto "${projectName}".\n\nPosso ajudar com:\n• Informações sobre tarefas e sprints\n• Enviar e-mails para a equipe\n• Insights sobre o progresso do projeto\n\nComo posso ajudar?`,
        timestamp: new Date(),
        type: "text",
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, projectName]);

  // Toggle voice recognition
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert("Reconhecimento de voz não suportado neste navegador.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  // Text-to-speech for Ada's responses
  const speakMessage = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 1;
    utterance.pitch = 1.1;

    // Try to find a female Portuguese voice
    // Wait for voices to load if needed
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();

      // Priority order for female Portuguese voices
      const femaleVoice = voices.find(
        (voice) =>
          voice.lang.includes("pt") &&
          (voice.name.toLowerCase().includes("female") ||
            voice.name.toLowerCase().includes("feminina") ||
            voice.name.toLowerCase().includes("francisca") ||
            voice.name.toLowerCase().includes("luciana") ||
            voice.name.toLowerCase().includes("vitoria") ||
            voice.name.toLowerCase().includes("maria") ||
            voice.name.includes("Google português do Brasil") ||
            voice.name.includes("Microsoft Francisca"))
      );

      // Fallback: any Portuguese voice that's not explicitly male
      const anyPtVoice = voices.find(
        (voice) =>
          voice.lang.includes("pt") &&
          !voice.name.toLowerCase().includes("male") &&
          !voice.name.toLowerCase().includes("daniel") &&
          !voice.name.toLowerCase().includes("ricardo")
      );

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      } else if (anyPtVoice) {
        utterance.voice = anyPtVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    // Voices might not be loaded yet
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    } else {
      setVoice();
    }
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Calculate project statistics
  const getProjectStats = useCallback(() => {
    const total = projectTasks.length;
    const todo = projectTasks.filter((t) => t.status === "todo").length;
    const inProgress = projectTasks.filter(
      (t) => t.status === "in-progress",
    ).length;
    const review = projectTasks.filter((t) => t.status === "review").length;
    const done = projectTasks.filter((t) => t.status === "done").length;
    const blocked = projectTasks.filter((t) => t.status === "blocked").length;

    const totalPoints = projectTasks.reduce(
      (sum, t) => sum + (t.story_points || 0),
      0,
    );
    const completedPoints = projectTasks
      .filter((t) => t.status === "done")
      .reduce((sum, t) => sum + (t.story_points || 0), 0);

    const completionPercentage =
      totalPoints > 0
        ? Math.round((completedPoints / totalPoints) * 100)
        : done > 0
          ? Math.round((done / total) * 100)
          : 0;

    // Workload by team member
    const workload: Record<string, { tasks: number; points: number }> = {};
    projectTasks
      .filter((t) => t.status !== "done" && t.assigned_to_name)
      .forEach((t) => {
        const name = t.assigned_to_name!;
        if (!workload[name]) {
          workload[name] = { tasks: 0, points: 0 };
        }
        workload[name].tasks++;
        workload[name].points += t.story_points || 0;
      });

    return {
      total,
      todo,
      inProgress,
      review,
      done,
      blocked,
      totalPoints,
      completedPoints,
      completionPercentage,
      workload,
    };
  }, [projectTasks]);

  // Send message to n8n webhook
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const stats = getProjectStats();

      const payload = {
        message: userMessage.content,
        projectId,
        projectName,
        userId: user?.id,
        userEmail,
        userName,
        teamMembers: teamMembers.map((m) => ({
          id: m.id,
          name: m.full_name,
          email: m.email,
          role: m.role,
        })),
        projectData: {
          stats,
          tasks: projectTasks.slice(0, 50), // Send first 50 tasks for context
          todoTasks: projectTasks
            .filter((t) => t.status === "todo")
            .slice(0, 10),
          inProgressTasks: projectTasks.filter(
            (t) => t.status === "in-progress",
          ),
          blockedTasks: projectTasks.filter((t) => t.status === "blocked"),
        },
      };

      const response = await fetch(ADA_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Check if response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Try to parse the response
      const responseText = await response.text();
      let data;

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error("Failed to parse response:", responseText);
        data = {
          message:
            responseText || "Resposta recebida mas não pôde ser processada.",
        };
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          data.message ||
          data.response ||
          "Desculpe, não consegui processar sua solicitação.",
        timestamp: new Date(),
        type: data.type || "text",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Auto-speak the response
      if (assistantMessage.content && assistantMessage.type !== "error") {
        speakMessage(assistantMessage.content);
      }
    } catch (error) {
      console.error("Error sending message to Ada:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Desculpe, estou com dificuldades para me conectar ao servidor. Verifique se o workflow n8n está ativo e tente novamente.",
        timestamp: new Date(),
        type: "error",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Message type styling
  const getMessageStyle = (type?: string) => {
    switch (type) {
      case "email_sent":
        return {
          bgcolor: alpha("#10b981", 0.1),
          borderColor: alpha("#10b981", 0.3),
        };
      case "clarification":
        return {
          bgcolor: alpha("#f59e0b", 0.1),
          borderColor: alpha("#f59e0b", 0.3),
        };
      case "error":
        return {
          bgcolor: alpha("#ef4444", 0.1),
          borderColor: alpha("#ef4444", 0.3),
        };
      default:
        return {
          bgcolor: isDarkMode ? alpha("#1e293b", 0.8) : "white",
          borderColor: alpha("#8b5cf6", 0.2),
        };
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <Zoom in={!isOpen}>
        <Fab
          color="primary"
          onClick={() => setIsOpen(true)}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 64,
            height: 64,
            background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
            boxShadow: "0 8px 32px rgba(139, 92, 246, 0.4)",
            "&:hover": {
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              transform: "scale(1.05)",
            },
            transition: "all 0.3s ease",
            zIndex: 1200,
          }}
        >
          <Badge
            badgeContent={
              <AutoAwesome sx={{ fontSize: 12, color: "#fbbf24" }} />
            }
            sx={{
              "& .MuiBadge-badge": {
                bgcolor: "transparent",
                top: -4,
                right: -4,
              },
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid rgba(255, 255, 255, 0.5)",
              }}
            >
              <img
                src="/ADA.png"
                alt="Ada"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>
          </Badge>
        </Fab>
      </Zoom>

      {/* Chat Window */}
      <Zoom in={isOpen}>
        <Paper
          elevation={24}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: isMinimized ? 320 : 400,
            height: isMinimized ? "auto" : 600,
            maxHeight: "80vh",
            borderRadius: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: isDarkMode
              ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)",
            border: "2px solid",
            borderColor: alpha("#8b5cf6", 0.2),
            boxShadow: isDarkMode
              ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
              : "0 25px 50px -12px rgba(139, 92, 246, 0.25)",
            zIndex: 1300,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background:
                "linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #ec4899 100%)",
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                overflow: "hidden",
                border: "3px solid rgba(255, 255, 255, 0.5)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                flexShrink: 0,
              }}
            >
              <img
                src="/ADA.png"
                alt="Ada"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{ color: "white" }}
              >
                Ada
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "#10b981",
                    animation: "pulse 2s infinite",
                    "@keyframes pulse": {
                      "0%": { opacity: 1 },
                      "50%": { opacity: 0.5 },
                      "100%": { opacity: 1 },
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255, 255, 255, 0.8)" }}
                >
                  Online • {projectTasks.length} tarefas carregadas
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Tooltip title={isSpeaking ? "Parar áudio" : "Áudio ativado"}>
                <IconButton
                  size="small"
                  onClick={isSpeaking ? stopSpeaking : undefined}
                  sx={{ color: "white", bgcolor: "rgba(255, 255, 255, 0.1)" }}
                >
                  {isSpeaking ? <VolumeOff /> : <VolumeUp />}
                </IconButton>
              </Tooltip>
              <Tooltip title={isMinimized ? "Expandir" : "Minimizar"}>
                <IconButton
                  size="small"
                  onClick={() => setIsMinimized(!isMinimized)}
                  sx={{ color: "white", bgcolor: "rgba(255, 255, 255, 0.1)" }}
                >
                  {isMinimized ? <OpenInFull /> : <Minimize />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Fechar">
                <IconButton
                  size="small"
                  onClick={() => setIsOpen(false)}
                  sx={{
                    color: "white",
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
                  }}
                >
                  <Close />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Project Context Chip */}
          <Collapse in={!isMinimized}>
            <Box sx={{ px: 2, py: 1, bgcolor: alpha("#8b5cf6", 0.05) }}>
              <Chip
                icon={<Psychology sx={{ fontSize: 16 }} />}
                label={`Projeto: ${projectName}`}
                size="small"
                sx={{
                  bgcolor: alpha("#8b5cf6", 0.1),
                  color: "#8b5cf6",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                }}
              />
            </Box>
          </Collapse>

          {/* Messages */}
          <Collapse in={!isMinimized}>
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                minHeight: 350,
                maxHeight: 350,
              }}
            >
              {messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    display: "flex",
                    justifyContent:
                      message.role === "user" ? "flex-end" : "flex-start",
                    gap: 1,
                  }}
                >
                  {message.role === "assistant" && (
                    <Avatar
                      src="/ADA.png"
                      sx={{
                        width: 32,
                        height: 32,
                        border: "2px solid",
                        borderColor: alpha("#8b5cf6", 0.3),
                      }}
                    />
                  )}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      maxWidth: "80%",
                      borderRadius: 2,
                      border: "1px solid",
                      ...getMessageStyle(message.type),
                      ...(message.role === "user" && {
                        bgcolor:
                          "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                        background:
                          "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                        color: "white",
                        borderColor: "transparent",
                      }),
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.6,
                        color:
                          message.role === "user" ? "white" : "text.primary",
                      }}
                    >
                      {message.content}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        mt: 0.5,
                        opacity: 0.7,
                        textAlign: "right",
                        color:
                          message.role === "user"
                            ? "rgba(255,255,255,0.7)"
                            : "text.secondary",
                      }}
                    >
                      {message.timestamp.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>
                  </Paper>
                  {message.role === "user" && (
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: "#6366f1",
                        fontSize: "0.875rem",
                      }}
                    >
                      {userName?.charAt(0) || "U"}
                    </Avatar>
                  )}
                </Box>
              ))}

              {isLoading && (
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Avatar
                    src="/ADA.png"
                    sx={{
                      width: 32,
                      height: 32,
                      border: "2px solid",
                      borderColor: alpha("#8b5cf6", 0.3),
                    }}
                  />
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: isDarkMode ? alpha("#1e293b", 0.8) : "white",
                      border: "1px solid",
                      borderColor: alpha("#8b5cf6", 0.2),
                      display: "flex",
                      gap: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                        "& > div": {
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#8b5cf6",
                          animation: "bounce 1.4s infinite ease-in-out both",
                        },
                        "& > div:nth-of-type(1)": {
                          animationDelay: "-0.32s",
                        },
                        "& > div:nth-of-type(2)": {
                          animationDelay: "-0.16s",
                        },
                        "@keyframes bounce": {
                          "0%, 80%, 100%": {
                            transform: "scale(0)",
                          },
                          "40%": {
                            transform: "scale(1)",
                          },
                        },
                      }}
                    >
                      <div />
                      <div />
                      <div />
                    </Box>
                  </Paper>
                </Box>
              )}

              <div ref={messagesEndRef} />
            </Box>
          </Collapse>

          {/* Input */}
          <Collapse in={!isMinimized}>
            <Divider />
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
                <Tooltip
                  title={isListening ? "Parar gravação" : "Comando de voz"}
                >
                  <IconButton
                    onClick={toggleListening}
                    sx={{
                      bgcolor: isListening
                        ? alpha("#ef4444", 0.1)
                        : alpha("#8b5cf6", 0.1),
                      color: isListening ? "#ef4444" : "#8b5cf6",
                      animation: isListening ? "pulse 1s infinite" : "none",
                      "&:hover": {
                        bgcolor: isListening
                          ? alpha("#ef4444", 0.2)
                          : alpha("#8b5cf6", 0.2),
                      },
                    }}
                  >
                    {isListening ? <MicOff /> : <Mic />}
                  </IconButton>
                </Tooltip>

                <TextField
                  fullWidth
                  multiline
                  maxRows={3}
                  placeholder={
                    isListening
                      ? "Ouvindo..."
                      : "Digite sua mensagem ou use o microfone..."
                  }
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || isListening}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                      bgcolor: isDarkMode ? alpha("#1e293b", 0.5) : "white",
                      "& fieldset": {
                        borderColor: alpha("#8b5cf6", 0.2),
                      },
                      "&:hover fieldset": {
                        borderColor: alpha("#8b5cf6", 0.4),
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#8b5cf6",
                      },
                    },
                  }}
                />

                <Tooltip title="Enviar">
                  <IconButton
                    onClick={sendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    sx={{
                      bgcolor:
                        "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                      background:
                        "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                      color: "white",
                      "&:hover": {
                        background:
                          "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                      },
                      "&.Mui-disabled": {
                        bgcolor: alpha("#8b5cf6", 0.3),
                        color: "rgba(255, 255, 255, 0.5)",
                      },
                    }}
                  >
                    {isLoading ? (
                      <CircularProgress size={24} sx={{ color: "white" }} />
                    ) : (
                      <Send />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Quick Actions */}
              <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
                {[
                  "Tarefas pendentes",
                  "Progresso do projeto",
                  "Quem está sobrecarregado?",
                ].map((action) => (
                  <Chip
                    key={action}
                    label={action}
                    size="small"
                    onClick={() => setInputValue(action)}
                    sx={{
                      cursor: "pointer",
                      bgcolor: alpha("#8b5cf6", 0.05),
                      border: "1px solid",
                      borderColor: alpha("#8b5cf6", 0.2),
                      "&:hover": {
                        bgcolor: alpha("#8b5cf6", 0.1),
                        borderColor: alpha("#8b5cf6", 0.3),
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Collapse>

          {/* Minimized state input */}
          <Collapse in={isMinimized}>
            <Box sx={{ p: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Pergunte algo..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                InputProps={{
                  endAdornment: (
                    <IconButton size="small" onClick={sendMessage}>
                      <Send fontSize="small" />
                    </IconButton>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />
            </Box>
          </Collapse>
        </Paper>
      </Zoom>
    </>
  );
}

// Web Speech API types are defined in src/types/speech.d.ts
