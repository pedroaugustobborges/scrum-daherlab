import React, { useState } from "react";
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
  Collapse,
  alpha,
} from "@mui/material";
import {
  Dashboard,
  Assignment,
  People,
  Settings,
  Logout,
  AccountCircle,
  SpaceDashboard,
  MenuBook,
  Inventory,
  AdminPanelSettings,
  Menu as MenuIcon,
  Close,
  KeyboardArrowDown,
  ViewList,
  ViewKanban,
  CalendarMonth,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [projectsAnchorEl, setProjectsAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileProjectsOpen, setMobileProjectsOpen] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
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

  const handleProjectsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProjectsAnchorEl(event.currentTarget);
  };

  const handleProjectsMenuClose = () => {
    setProjectsAnchorEl(null);
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

  // Projects dropdown items
  const projectsMenuItems = [
    { label: "Ver Todos", path: "/projects", icon: <ViewList /> },
    { label: "Sprints", path: "/sprints", icon: <SpaceDashboard /> },
    { label: "Backlog", path: "/backlog", icon: <Inventory /> },
  ];

  // Main navigation items
  const menuItems = [
    { label: "Painel", path: "/dashboard", icon: <Dashboard /> },
    { label: "Planner", path: "/planner", icon: <ViewKanban /> },
    { label: "Calendário", path: "/calendar", icon: <CalendarMonth /> },
    { label: "Times", path: "/teams", icon: <People /> },
    { label: "Daher Lab", path: "/scrum-guide", icon: <MenuBook /> },
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
  const isProjectsActive = projectsMenuItems.some(
    (item) => location.pathname === item.path,
  );

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
            sx={{ fontWeight: 750, display: { xs: "none", sm: "block" } }}
          >
            agir ágil
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

          {/* Projetos Dropdown */}
          <Button
            color="inherit"
            startIcon={<Assignment />}
            endIcon={
              <KeyboardArrowDown
                sx={{
                  transform: Boolean(projectsAnchorEl)
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              />
            }
            onClick={handleProjectsMenuOpen}
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

          {/* Projects Dropdown Menu */}
          <Menu
            anchorEl={projectsAnchorEl}
            open={Boolean(projectsAnchorEl)}
            onClose={handleProjectsMenuClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                borderRadius: 3,
                minWidth: 200,
                boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                border: "1px solid rgba(99, 102, 241, 0.1)",
                overflow: "visible",
                "&:before": {
                  content: '""',
                  display: "block",
                  position: "absolute",
                  top: 0,
                  left: 24,
                  width: 12,
                  height: 12,
                  bgcolor: "background.paper",
                  transform: "translateY(-50%) rotate(45deg)",
                  borderLeft: "1px solid rgba(99, 102, 241, 0.1)",
                  borderTop: "1px solid rgba(99, 102, 241, 0.1)",
                },
              },
            }}
            transformOrigin={{ horizontal: "left", vertical: "top" }}
            anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
          >
            {projectsMenuItems.map((item, index) => (
              <MenuItem
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  handleProjectsMenuClose();
                }}
                sx={{
                  py: 1.5,
                  px: 2,
                  borderRadius: 2,
                  mx: 1,
                  my: index === 0 ? 1 : 0.5,
                  mb: index === projectsMenuItems.length - 1 ? 1 : 0.5,
                  backgroundColor: isActive(item.path)
                    ? alpha("#6366f1", 0.1)
                    : "transparent",
                  color: isActive(item.path) ? "#6366f1" : "inherit",
                  fontWeight: isActive(item.path) ? 600 : 500,
                  transition: "all 0.2s",
                  "&:hover": {
                    backgroundColor: alpha("#6366f1", 0.08),
                    transform: "translateX(4px)",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive(item.path) ? "#6366f1" : "inherit",
                    minWidth: 36,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {item.label}
              </MenuItem>
            ))}
          </Menu>

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
            {user?.user_metadata?.avatar_url ? (
              <Avatar
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata?.full_name || "User"}
                sx={{ width: 32, height: 32 }}
              />
            ) : (
              <AccountCircle />
            )}
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

            {/* Projetos Collapsible */}
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => setMobileProjectsOpen(!mobileProjectsOpen)}
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
                {mobileProjectsOpen ? (
                  <ExpandLess sx={{ color: "white" }} />
                ) : (
                  <ExpandMore sx={{ color: "white" }} />
                )}
              </ListItemButton>
            </ListItem>
            <Collapse in={mobileProjectsOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {projectsMenuItems.map((item) => (
                  <ListItem key={item.path} disablePadding sx={{ pl: 2 }}>
                    <ListItemButton
                      onClick={() => {
                        navigate(item.path);
                        handleDrawerToggle();
                      }}
                      sx={{
                        borderRadius: 2,
                        color: "white",
                        backgroundColor: isActive(item.path)
                          ? "rgba(255,255,255,0.2)"
                          : "transparent",
                        "&:hover": {
                          backgroundColor: "rgba(255,255,255,0.1)",
                        },
                      }}
                    >
                      <ListItemIcon sx={{ color: "white", minWidth: 36 }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontWeight: isActive(item.path) ? 700 : 500,
                          fontSize: "0.9rem",
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>

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
