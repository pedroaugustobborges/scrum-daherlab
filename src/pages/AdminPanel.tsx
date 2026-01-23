import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Avatar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import {
  Add,
  Person,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  AdminPanelSettings,
  Delete,
  Search,
  Shield,
  PersonAdd,
  Refresh,
  LockReset,
} from "@mui/icons-material";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

interface User {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function AdminPanel() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState(false);

  // Form state for creating user
  const [newUserForm, setNewUserForm] = useState({
    email: "",
    password: "",
    fullName: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_all_users");

      if (error) throw error;

      if (data?.success) {
        setUsers(data.users || []);
      } else {
        throw new Error(data?.error || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.email || !newUserForm.password || !newUserForm.fullName) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (newUserForm.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_create_user", {
        user_email: newUserForm.email,
        user_password: newUserForm.password,
        user_full_name: newUserForm.fullName,
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Usuário criado com sucesso!");
        setCreateDialogOpen(false);
        setNewUserForm({ email: "", password: "", fullName: "" });
        await fetchUsers();
      } else {
        throw new Error(data?.error || "Failed to create user");
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAdmin = async (targetUser: User) => {
    if (targetUser.id === user?.id) {
      toast.error("Você não pode alterar seu próprio status de admin");
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_toggle_user_admin", {
        target_user_id: targetUser.id,
        make_admin: !targetUser.is_admin,
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(
          targetUser.is_admin
            ? "Privilégios de admin removidos"
            : "Usuário promovido a admin",
        );
        await fetchUsers();
      } else {
        throw new Error(data?.error || "Failed to toggle admin status");
      }
    } catch (error: any) {
      console.error("Error toggling admin:", error);
      toast.error(error.message || "Erro ao alterar status de admin");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_delete_user", {
        target_user_id: userToDelete.id,
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Usuário excluído com sucesso!");
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        await fetchUsers();
      } else {
        throw new Error(data?.error || "Failed to delete user");
      }
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Erro ao excluir usuário");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!userToResetPassword || !newPassword) return;

    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_reset_user_password", {
        target_user_id: userToResetPassword.id,
        new_password: newPassword,
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Senha redefinida com sucesso!");
        setResetPasswordDialogOpen(false);
        setUserToResetPassword(null);
        setNewPassword("");
      } else {
        throw new Error(data?.error || "Failed to reset password");
      }
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Erro ao redefinir senha");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Redirect non-admins
  if (!isAdmin && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  background:
                    "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 16px rgba(220, 38, 38, 0.3)",
                }}
              >
                <AdminPanelSettings sx={{ color: "white", fontSize: 28 }} />
              </Box>
              <Typography variant="h3" fontWeight={800}>
                Painel Admin
              </Typography>
            </Box>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              Gerencie usuários e permissões do sistema
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: "1rem",
              background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)",
              },
              display: { xs: "none", sm: "flex" },
            }}
          >
            Novo Usuário
          </Button>
        </Box>

        {/* Stats Cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "1fr 1fr 1fr",
            },
            gap: 3,
            mb: 4,
          }}
        >
          <Card
            elevation={0}
            sx={{
              background:
                "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)",
              border: "2px solid rgba(99, 102, 241, 0.2)",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Person sx={{ color: "#6366f1", fontSize: 32 }} />
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{ color: "#6366f1" }}
                  >
                    {users.length}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    Total de Usuários
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card
            elevation={0}
            sx={{
              background:
                "linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(239, 68, 68, 0.05) 100%)",
              border: "2px solid rgba(220, 38, 38, 0.2)",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Shield sx={{ color: "#dc2626", fontSize: 32 }} />
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{ color: "#dc2626" }}
                  >
                    {users.filter((u) => u.is_admin).length}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    Administradores
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card
            elevation={0}
            sx={{
              background:
                "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)",
              border: "2px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Person sx={{ color: "#10b981", fontSize: 32 }} />
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{ color: "#10b981" }}
                  >
                    {users.filter((u) => !u.is_admin).length}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    Usuários Comuns
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Search and Actions */}
        <Card
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            border: "2px solid rgba(99, 102, 241, 0.1)",
          }}
        >
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 250 }}
            />
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchUsers}
              disabled={loading}
              sx={{
                borderWidth: 2,
                "&:hover": { borderWidth: 2 },
              }}
            >
              Atualizar
            </Button>
          </Box>
        </Card>

        {/* Users Table */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              border: "2px solid rgba(99, 102, 241, 0.1)",
              borderRadius: 3,
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(99, 102, 241, 0.05)" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Usuário</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Criado em</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Último Login</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    Ações
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <Typography variant="body1" color="text.secondary">
                        Nenhum usuário encontrado
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow
                      key={u.id}
                      sx={{
                        "&:hover": { bgcolor: "rgba(99, 102, 241, 0.02)" },
                        bgcolor:
                          u.id === user?.id
                            ? "rgba(99, 102, 241, 0.05)"
                            : "inherit",
                      }}
                    >
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 2 }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: u.is_admin ? "#dc2626" : "#6366f1",
                              fontWeight: 700,
                            }}
                          >
                            {u.full_name?.charAt(0) || u.email.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {u.full_name || "Sem nome"}
                            </Typography>
                            {u.id === user?.id && (
                              <Chip
                                label="Você"
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "0.65rem",
                                  bgcolor: "rgba(99, 102, 241, 0.1)",
                                  color: "#6366f1",
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{u.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={u.is_admin ? "Admin" : "Usuário"}
                          size="small"
                          icon={
                            u.is_admin ? (
                              <Shield sx={{ fontSize: 14 }} />
                            ) : undefined
                          }
                          sx={{
                            bgcolor: u.is_admin
                              ? "rgba(220, 38, 38, 0.1)"
                              : "rgba(107, 114, 128, 0.1)",
                            color: u.is_admin ? "#dc2626" : "#6b7280",
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(u.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(u.last_sign_in_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            justifyContent: "flex-end",
                          }}
                        >
                          <Tooltip title="Redefinir senha">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setUserToResetPassword(u);
                                  setResetPasswordDialogOpen(true);
                                }}
                                disabled={actionLoading}
                                sx={{
                                  bgcolor: "rgba(245, 158, 11, 0.1)",
                                  "&:hover": {
                                    bgcolor: "rgba(245, 158, 11, 0.2)",
                                  },
                                }}
                              >
                                <LockReset
                                  sx={{ fontSize: 18, color: "#f59e0b" }}
                                />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip
                            title={
                              u.is_admin ? "Remover admin" : "Tornar admin"
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleAdmin(u)}
                                disabled={u.id === user?.id || actionLoading}
                                sx={{
                                  bgcolor: u.is_admin
                                    ? "rgba(220, 38, 38, 0.1)"
                                    : "rgba(99, 102, 241, 0.1)",
                                  "&:hover": {
                                    bgcolor: u.is_admin
                                      ? "rgba(220, 38, 38, 0.2)"
                                      : "rgba(99, 102, 241, 0.2)",
                                  },
                                }}
                              >
                                <Shield
                                  sx={{
                                    fontSize: 18,
                                    color: u.is_admin ? "#dc2626" : "#6366f1",
                                  }}
                                />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Excluir usuário">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setUserToDelete(u);
                                  setDeleteDialogOpen(true);
                                }}
                                disabled={u.id === user?.id || actionLoading}
                                sx={{
                                  bgcolor: "rgba(239, 68, 68, 0.1)",
                                  "&:hover": {
                                    bgcolor: "rgba(239, 68, 68, 0.2)",
                                  },
                                }}
                              >
                                <Delete
                                  sx={{ fontSize: 18, color: "#ef4444" }}
                                />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>

      {/* Create User Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => !actionLoading && setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <PersonAdd sx={{ color: "#6366f1" }} />
            Criar Novo Usuário
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3, mt: 1 }}>
            O usuário será criado com a senha definida e poderá fazer login
            imediatamente. Nenhum email de verificação será enviado.
          </Alert>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Nome Completo"
              value={newUserForm.fullName}
              onChange={(e) =>
                setNewUserForm({ ...newUserForm, fullName: e.target.value })
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: "#6366f1" }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newUserForm.email}
              onChange={(e) =>
                setNewUserForm({ ...newUserForm, email: e.target.value })
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: "#6366f1" }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Senha"
              type={showPassword ? "text" : "password"}
              value={newUserForm.password}
              onChange={(e) =>
                setNewUserForm({ ...newUserForm, password: e.target.value })
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: "#6366f1" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              helperText="Mínimo de 6 caracteres"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            variant="outlined"
            onClick={() => setCreateDialogOpen(false)}
            disabled={actionLoading}
            sx={{ borderWidth: 2, "&:hover": { borderWidth: 2 } }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateUser}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <Add />}
          >
            {actionLoading ? "Criando..." : "Criar Usuário"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !actionLoading && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#ef4444" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Delete sx={{ color: "#ef4444" }} />
            Confirmar Exclusão
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Esta ação não pode ser desfeita!
          </Alert>
          <Typography>
            Tem certeza que deseja excluir o usuário{" "}
            <strong>{userToDelete?.full_name || userToDelete?.email}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Email: {userToDelete?.email}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteDialogOpen(false)}
            disabled={actionLoading}
            sx={{ borderWidth: 2, "&:hover": { borderWidth: 2 } }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteUser}
            disabled={actionLoading}
            startIcon={
              actionLoading ? <CircularProgress size={20} /> : <Delete />
            }
          >
            {actionLoading ? "Excluindo..." : "Excluir Usuário"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetPasswordDialogOpen}
        onClose={() => {
          if (!actionLoading) {
            setResetPasswordDialogOpen(false);
            setUserToResetPassword(null);
            setNewPassword("");
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#f59e0b" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <LockReset sx={{ color: "#f59e0b" }} />
            Redefinir Senha
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3, mt: 1 }}>
            A nova senha será aplicada imediatamente. O usuário precisará usar
            esta senha no próximo login.
          </Alert>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Usuário:
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {userToResetPassword?.full_name || "Sem nome"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {userToResetPassword?.email}
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="Nova Senha"
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock sx={{ color: "#f59e0b" }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            helperText="Mínimo de 6 caracteres"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setResetPasswordDialogOpen(false);
              setUserToResetPassword(null);
              setNewPassword("");
            }}
            disabled={actionLoading}
            sx={{ borderWidth: 2, "&:hover": { borderWidth: 2 } }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleResetPassword}
            disabled={actionLoading || !newPassword}
            startIcon={
              actionLoading ? <CircularProgress size={20} /> : <LockReset />
            }
            sx={{
              bgcolor: "#f59e0b",
              "&:hover": { bgcolor: "#d97706" },
            }}
          >
            {actionLoading ? "Redefinindo..." : "Redefinir Senha"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
