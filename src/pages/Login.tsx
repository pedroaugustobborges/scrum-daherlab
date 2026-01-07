import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  Tab,
  Tabs,
} from "@mui/material";
import {
  VisibilityOutlined,
  VisibilityOffOutlined,
  EmailOutlined,
  LockOutlined,
  PersonOutlined,
} from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Login() {
  const [tabValue, setTabValue] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError("");
    setSuccess("");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await signUp(email, password, fullName);
      setSuccess(
        "Conta criada com sucesso! Verifique seu e-mail para confirmar sua conta."
      );
      setEmail("");
      setPassword("");
      setFullName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 30%, #dbeafe 60%, #ede9fe 100%)",
        padding: 3,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.06) 0%, transparent 60%)
          `,
          animation: "gradientShift 20s ease-in-out infinite",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            repeating-linear-gradient(
              0deg,
              rgba(99, 102, 241, 0.02) 0px,
              transparent 1px,
              transparent 40px,
              rgba(99, 102, 241, 0.02) 41px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(99, 102, 241, 0.02) 0px,
              transparent 1px,
              transparent 40px,
              rgba(99, 102, 241, 0.02) 41px
            )
          `,
          opacity: 0.5,
        },
        "@keyframes gradientShift": {
          "0%, 100%": {
            transform: "scale(1) rotate(0deg)",
            opacity: 0.6,
          },
          "50%": {
            transform: "scale(1.05) rotate(1deg)",
            opacity: 1,
          },
        },
      }}
    >
      <Card
        sx={{
          maxWidth: 520,
          width: "100%",
          borderRadius: 6,
          boxShadow:
            "0 30px 60px -12px rgba(99, 102, 241, 0.15), 0 10px 30px -10px rgba(139, 92, 246, 0.1)",
          backdropFilter: "blur(24px) saturate(180%)",
          background: "rgba(255, 255, 255, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.8)",
          position: "relative",
          zIndex: 1,
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            boxShadow:
              "0 40px 80px -12px rgba(99, 102, 241, 0.2), 0 15px 40px -10px rgba(139, 92, 246, 0.15)",
            transform: "translateY(-4px)",
          },
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            borderRadius: 6,
            padding: "1px",
            background:
              "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.1))",
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            pointerEvents: "none",
          },
        }}
      >
        <CardContent sx={{ p: 6 }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 6 }}>
            <img
              src="/logo-daherlab.png"
              alt="Daher Lab"
              style={{
                maxWidth: "280px",
                height: "auto",
                filter: "drop-shadow(0 4px 12px rgba(99, 102, 241, 0.15))",
                transition: "all 0.3s ease",
              }}
            />
          </Box>

          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            align="center"
            sx={{
              fontWeight: 800,
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 2,
              letterSpacing: "-0.02em",
            }}
          >
            Agir Ágil
          </Typography>

          <Typography
            variant="body1"
            align="center"
            sx={{
              mb: 6,
              fontWeight: 500,
              color: "rgba(71, 85, 105, 0.8)",
              fontSize: "1.1rem",
              letterSpacing: "0.02em",
            }}
          >
            {/* Agir é ágil */}
          </Typography>

          <Box
            sx={{
              borderBottom: "1px solid rgba(99, 102, 241, 0.15)",
              mb: 4,
            }}
          >
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              centered
              sx={{
                "& .MuiTab-root": {
                  color: "rgba(71, 85, 105, 0.6)",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  transition: "all 0.3s ease",
                  "&.Mui-selected": {
                    color: "#6366f1",
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "#6366f1",
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                },
              }}
            >
              <Tab label="Entrar" />
              <Tab label="Criar Conta" />
            </Tabs>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 3,
                backdropFilter: "blur(12px)",
                background: "rgba(254, 226, 226, 0.8)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#dc2626",
                "& .MuiAlert-icon": {
                  color: "#dc2626",
                },
              }}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity="success"
              sx={{
                mb: 3,
                borderRadius: 3,
                backdropFilter: "blur(12px)",
                background: "rgba(220, 252, 231, 0.8)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                color: "#16a34a",
                "& .MuiAlert-icon": {
                  color: "#16a34a",
                },
              }}
            >
              {success}
            </Alert>
          )}

          <TabPanel value={tabValue} index={0}>
            <form onSubmit={handleSignIn}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                margin="normal"
                autoComplete="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlined
                        sx={{ color: "rgba(99, 102, 241, 0.5)" }}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    backgroundColor: "rgba(255, 255, 255, 0.6)",
                    backdropFilter: "blur(12px)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "& fieldset": {
                      borderColor: "rgba(99, 102, 241, 0.2)",
                      borderWidth: "1.5px",
                      transition: "all 0.3s ease",
                    },
                    "&:hover fieldset": {
                      borderColor: "rgba(99, 102, 241, 0.4)",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#6366f1",
                      borderWidth: "2px",
                    },
                    "&.Mui-focused": {
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      boxShadow: "0 0 0 4px rgba(99, 102, 241, 0.1)",
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgba(71, 85, 105, 0.7)",
                    "&.Mui-focused": {
                      color: "#6366f1",
                    },
                  },
                  "& .MuiInputBase-input": {
                    color: "rgba(15, 23, 42, 0.95)",
                    padding: "16px 14px",
                  },
                }}
              />
              <TextField
                fullWidth
                label="Senha"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                margin="normal"
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined sx={{ color: "rgba(99, 102, 241, 0.5)" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{
                          color: "rgba(99, 102, 241, 0.6)",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            color: "#6366f1",
                            backgroundColor: "rgba(99, 102, 241, 0.1)",
                          },
                        }}
                      >
                        {showPassword ? (
                          <VisibilityOffOutlined />
                        ) : (
                          <VisibilityOutlined />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    backgroundColor: "rgba(255, 255, 255, 0.6)",
                    backdropFilter: "blur(12px)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "& fieldset": {
                      borderColor: "rgba(99, 102, 241, 0.2)",
                      borderWidth: "1.5px",
                      transition: "all 0.3s ease",
                    },
                    "&:hover fieldset": {
                      borderColor: "rgba(99, 102, 241, 0.4)",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#6366f1",
                      borderWidth: "2px",
                    },
                    "&.Mui-focused": {
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      boxShadow: "0 0 0 4px rgba(99, 102, 241, 0.1)",
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgba(71, 85, 105, 0.7)",
                    "&.Mui-focused": {
                      color: "#6366f1",
                    },
                  },
                  "& .MuiInputBase-input": {
                    color: "rgba(15, 23, 42, 0.95)",
                    padding: "16px 14px",
                  },
                }}
              />
              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                sx={{
                  mt: 2,
                  mb: 2,
                  py: 2,
                  fontSize: "1rem",
                  fontWeight: 600,
                  borderRadius: 3,
                  textTransform: "none",
                  letterSpacing: "0.5px",
                  background:
                    "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  boxShadow: "0 8px 24px rgba(99, 102, 241, 0.35)",
                  color: "#ffffff",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    boxShadow: "0 12px 32px rgba(99, 102, 241, 0.45)",
                    transform: "translateY(-2px)",
                  },
                  "&:active": {
                    transform: "translateY(0)",
                  },
                  "&.Mui-disabled": {
                    background: "rgba(99, 102, 241, 0.2)",
                    color: "rgba(71, 85, 105, 0.4)",
                  },
                }}
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <form onSubmit={handleSignUp}>
              <TextField
                fullWidth
                label="Nome Completo"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                margin="normal"
                autoComplete="name"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlined
                        sx={{ color: "rgba(99, 102, 241, 0.5)" }}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    backdropFilter: "blur(12px)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "& fieldset": {
                      borderColor: "rgba(255, 255, 255, 0.12)",
                      borderWidth: "1.5px",
                      transition: "all 0.3s ease",
                    },
                    "&:hover fieldset": {
                      borderColor: "rgba(96, 165, 250, 0.5)",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#60a5fa",
                      borderWidth: "2px",
                    },
                    "&.Mui-focused": {
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 0 0 4px rgba(96, 165, 250, 0.1)",
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgba(255, 255, 255, 0.6)",
                    "&.Mui-focused": {
                      color: "#60a5fa",
                    },
                  },
                  "& .MuiInputBase-input": {
                    color: "rgba(255, 255, 255, 0.95)",
                    padding: "16px 14px",
                  },
                }}
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                margin="normal"
                autoComplete="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlined
                        sx={{ color: "rgba(99, 102, 241, 0.5)" }}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    backgroundColor: "rgba(255, 255, 255, 0.6)",
                    backdropFilter: "blur(12px)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "& fieldset": {
                      borderColor: "rgba(99, 102, 241, 0.2)",
                      borderWidth: "1.5px",
                      transition: "all 0.3s ease",
                    },
                    "&:hover fieldset": {
                      borderColor: "rgba(99, 102, 241, 0.4)",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#6366f1",
                      borderWidth: "2px",
                    },
                    "&.Mui-focused": {
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      boxShadow: "0 0 0 4px rgba(99, 102, 241, 0.1)",
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgba(71, 85, 105, 0.7)",
                    "&.Mui-focused": {
                      color: "#6366f1",
                    },
                  },
                  "& .MuiInputBase-input": {
                    color: "rgba(15, 23, 42, 0.95)",
                    padding: "16px 14px",
                  },
                }}
              />
              <TextField
                fullWidth
                label="Senha"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                margin="normal"
                autoComplete="new-password"
                helperText="Mínimo 6 caracteres"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined sx={{ color: "rgba(99, 102, 241, 0.5)" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{
                          color: "rgba(99, 102, 241, 0.6)",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            color: "#6366f1",
                            backgroundColor: "rgba(99, 102, 241, 0.1)",
                          },
                        }}
                      >
                        {showPassword ? (
                          <VisibilityOffOutlined />
                        ) : (
                          <VisibilityOutlined />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    backgroundColor: "rgba(255, 255, 255, 0.6)",
                    backdropFilter: "blur(12px)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "& fieldset": {
                      borderColor: "rgba(99, 102, 241, 0.2)",
                      borderWidth: "1.5px",
                      transition: "all 0.3s ease",
                    },
                    "&:hover fieldset": {
                      borderColor: "rgba(99, 102, 241, 0.4)",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#6366f1",
                      borderWidth: "2px",
                    },
                    "&.Mui-focused": {
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      boxShadow: "0 0 0 4px rgba(99, 102, 241, 0.1)",
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgba(71, 85, 105, 0.7)",
                    "&.Mui-focused": {
                      color: "#6366f1",
                    },
                  },
                  "& .MuiInputBase-input": {
                    color: "rgba(15, 23, 42, 0.95)",
                    padding: "16px 14px",
                  },
                  "& .MuiFormHelperText-root": {
                    color: "rgba(71, 85, 105, 0.6)",
                    marginLeft: 0.5,
                  },
                }}
              />
              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                sx={{
                  mt: 2,
                  mb: 2,
                  py: 2,
                  fontSize: "1rem",
                  fontWeight: 600,
                  borderRadius: 3,
                  textTransform: "none",
                  letterSpacing: "0.5px",
                  background:
                    "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  boxShadow: "0 8px 24px rgba(99, 102, 241, 0.35)",
                  color: "#ffffff",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    boxShadow: "0 12px 32px rgba(99, 102, 241, 0.45)",
                    transform: "translateY(-2px)",
                  },
                  "&:active": {
                    transform: "translateY(0)",
                  },
                  "&.Mui-disabled": {
                    background: "rgba(99, 102, 241, 0.2)",
                    color: "rgba(71, 85, 105, 0.4)",
                  },
                }}
              >
                {loading ? "Criando conta..." : "Criar Conta"}
              </Button>
            </form>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
}
