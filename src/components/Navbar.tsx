import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Divider,
  ListItemIcon,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import {
  Dashboard,
  Assignment,
  People,
  Settings,
  Logout,
  MenuBook,
  AdminPanelSettings,
  Menu as MenuIcon,
  Close,
  ViewKanban,
  CalendarMonth,
} from "@mui/icons-material";
import { useTheme as useMUITheme } from "@mui/material/styles";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { user, signOut, isAdmin } = useAuth();
  const muiTheme = useMUITheme();
  const isDarkMode = muiTheme.palette.mode === "dark";

  // Fetch avatar from profiles table
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };

    fetchAvatar();

    // Subscribe to realtime changes on the profiles table for this user
    const channel = supabase
      .channel("navbar-avatar")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user?.id}`,
        },
        (payload) => {
          if (payload.new?.avatar_url !== undefined) {
            setAvatarUrl(payload.new.avatar_url);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
    handleClose();
  };

  // Main navigation items
  const menuItems = [
    { label: "Painel", path: "/dashboard", icon: <Dashboard /> },
    { label: "Planner", path: "/planner", icon: <ViewKanban /> },
    { label: "Calendário", path: "/calendar", icon: <CalendarMonth /> },
    { label: "Times", path: "/teams", icon: <People /> },
    { label: "daher.lab", path: "/scrum-guide", icon: <MenuBook /> },
  ];

  // Add admin menu item if user is admin
  if (isAdmin) {
    menuItems.push({
      label: "Admin",
      path: "/admin",
      icon: <AdminPanelSettings />,
    });
  }

  const isActive = (path: string) => location.pathname === path;

  const getInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || "";
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  const isProjectsActive = location.pathname === "/projects";

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", py: 1 }}>
        {/* Mobile menu button */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ display: { md: "none" }, mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <img
            src="/logo_branca_sem_slogan.png"
            alt="Daher Lab"
            style={{ height: "40px", cursor: "pointer" }}
            onClick={() => navigate("/dashboard")}
          />
          <Divider
            orientation="vertical"
            flexItem
            sx={{
              bgcolor: "rgba(255,255,255,0.3)",
              display: { xs: "none", sm: "block" },
            }}
          />
          <Typography
            variant="h6"
            component="div"
            className="font-agir-agil"
            sx={{
              fontFamily: "'Kozuka Gothic Pro', 'Inter', sans-serif",
              fontWeight: 700,
              display: { xs: "none", sm: "block" },
            }}
          >
            Daher Plan
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Painel */}
          <Button
            color="inherit"
            startIcon={<Dashboard />}
            onClick={() => navigate("/dashboard")}
            sx={{
              display: { xs: "none", md: "flex" },
              fontWeight: 600,
              px: 2.5,
              py: 1,
              borderRadius: 3,
              backgroundColor: isActive("/dashboard")
                ? "rgba(255,255,255,0.25)"
                : "transparent",
              backdropFilter: isActive("/dashboard") ? "blur(10px)" : "none",
              border: isActive("/dashboard")
                ? "1px solid rgba(255,255,255,0.3)"
                : "1px solid transparent",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
                transform: "translateY(-2px)",
              },
            }}
          >
            Painel
          </Button>

          {/* Projetos */}
          <Button
            color="inherit"
            startIcon={<Assignment />}
            onClick={() => navigate("/projects")}
            sx={{
              display: { xs: "none", md: "flex" },
              fontWeight: 600,
              px: 2.5,
              py: 1,
              borderRadius: 3,
              backgroundColor: isProjectsActive
                ? "rgba(255,255,255,0.25)"
                : "transparent",
              backdropFilter: isProjectsActive ? "blur(10px)" : "none",
              border: isProjectsActive
                ? "1px solid rgba(255,255,255,0.3)"
                : "1px solid transparent",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
                transform: "translateY(-2px)",
              },
            }}
          >
            Projetos
          </Button>

          {/* Other menu items */}
          {menuItems.slice(1).map((item) => (
            <Button
              key={item.path}
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{
                display: { xs: "none", md: "flex" },
                fontWeight: 600,
                px: 2.5,
                py: 1,
                borderRadius: 3,
                backgroundColor: isActive(item.path)
                  ? "rgba(255,255,255,0.25)"
                  : "transparent",
                backdropFilter: isActive(item.path) ? "blur(10px)" : "none",
                border: isActive(item.path)
                  ? "1px solid rgba(255,255,255,0.3)"
                  : "1px solid transparent",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              {item.label}
            </Button>
          ))}

          <IconButton
            size="large"
            onClick={handleMenu}
            color="inherit"
            sx={{ ml: 1 }}
          >
            <Avatar
              src={avatarUrl || undefined}
              alt={user?.user_metadata?.full_name || "User"}
              sx={{
                width: 32,
                height: 32,
                bgcolor: avatarUrl ? "transparent" : "#7c3aed",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              {!avatarUrl && getInitials()}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {user?.user_metadata?.full_name || "Usuário"}
                </Typography>
                {isAdmin && (
                  <Box
                    sx={{
                      px: 1,
                      py: 0.25,
                      bgcolor: "rgba(220, 38, 38, 0.1)",
                      borderRadius: 1,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: "#dc2626",
                    }}
                  >
                    ADMIN
                  </Box>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            {isAdmin && (
              <MenuItem
                onClick={() => {
                  navigate("/admin");
                  handleClose();
                }}
                sx={{
                  color: "#dc2626",
                  "&:hover": {
                    bgcolor: "rgba(220, 38, 38, 0.05)",
                  },
                }}
              >
                <ListItemIcon>
                  <AdminPanelSettings
                    fontSize="small"
                    sx={{ color: "#dc2626" }}
                  />
                </ListItemIcon>
                Painel Admin
              </MenuItem>
            )}
            <MenuItem
              onClick={() => {
                navigate("/settings");
                handleClose();
              }}
            >
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              Configurações
            </MenuItem>
            <MenuItem onClick={handleSignOut}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Sair
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: 280,
            background: "linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)",
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <img
              src="/logo_branca_sem_slogan.png"
              alt="Daher Lab"
              style={{ height: "36px" }}
            />
            <IconButton
              color="inherit"
              onClick={handleDrawerToggle}
              sx={{ color: "white" }}
            >
              <Close />
            </IconButton>
          </Box>
          <Divider sx={{ bgcolor: "rgba(255,255,255,0.2)", mb: 2 }} />
          <List>
            {/* Painel */}
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => {
                  navigate("/dashboard");
                  handleDrawerToggle();
                }}
                sx={{
                  borderRadius: 2,
                  color: "white",
                  backgroundColor: isActive("/dashboard")
                    ? "rgba(255,255,255,0.25)"
                    : "transparent",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.15)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
                  <Dashboard />
                </ListItemIcon>
                <ListItemText
                  primary="Painel"
                  primaryTypographyProps={{
                    fontWeight: isActive("/dashboard") ? 700 : 500,
                  }}
                />
              </ListItemButton>
            </ListItem>

            {/* Projetos */}
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => {
                  navigate("/projects");
                  handleDrawerToggle();
                }}
                sx={{
                  borderRadius: 2,
                  color: "white",
                  backgroundColor: isProjectsActive
                    ? "rgba(255,255,255,0.25)"
                    : "transparent",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.15)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
                  <Assignment />
                </ListItemIcon>
                <ListItemText
                  primary="Projetos"
                  primaryTypographyProps={{
                    fontWeight: isProjectsActive ? 700 : 500,
                  }}
                />
              </ListItemButton>
            </ListItem>

            {/* Other Menu Items */}
            {menuItems.slice(1).map((item) => (
              <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    handleDrawerToggle();
                  }}
                  sx={{
                    borderRadius: 2,
                    color: "white",
                    backgroundColor: isActive(item.path)
                      ? "rgba(255,255,255,0.25)"
                      : "transparent",
                    "&:hover": {
                      backgroundColor: "rgba(255,255,255,0.15)",
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive(item.path) ? 700 : 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ bgcolor: "rgba(255,255,255,0.2)", my: 2 }} />
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
              Conectado como
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{ color: "white", fontWeight: 600 }}
            >
              {user?.user_metadata?.full_name || user?.email}
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </AppBar>
  );
}
