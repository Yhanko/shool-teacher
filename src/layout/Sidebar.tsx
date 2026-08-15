import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  Users,
  Calendar,
  MessageCircle,
  Bell,
  Settings,
  LogOut,
  GraduationCap,
  User,
  Menu,
  Bot,
  ClipboardCheck,
  BookOpen,
  FileSignature,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

// Note: Using relative path to the src/assets for Vite to bundle
//import yhankoLogo from '@/assets/yhankoIMG.png';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ activeTab, onTabChange, mobileOpen, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user) {
      import('@/services/api/axios').then(({ default: api }) => {
        api.get('/notifications')
          .then(res => {
            const unread = (res.data || []).filter((n: any) => !n.isRead).length;
            setUnreadNotifications(unread);
          })
          .catch(e => console.error('Failed to fetch notifications', e));

        api.get('/messages/inbox')
          .then(res => {
            const unreadMsgs = (res.data || []).filter((chat: any) =>
              chat.lastMessage && !chat.lastMessage.read && !chat.lastMessage.isSender
            ).length;
            setUnreadMessages(unreadMsgs);
          })
          .catch(e => console.error('Failed to fetch messages inbox', e));
      });
    }
  }, [user]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'notas', label: 'Notas & Pauta', icon: GraduationCap },
    { id: 'chat', label: 'Mensagens', icon: MessageCircle, badge: (activeTab === 'chat') ? undefined : (unreadMessages > 0 ? unreadMessages : undefined) },
    { id: 'notificacoes', label: 'Notificações', icon: Bell, badge: unreadNotifications > 0 ? unreadNotifications : undefined },
    { id: 'atividades', label: 'Atividades', icon: Calendar },
    { id: 'assistante', label: 'Assistente IA', icon: Bot },
    { id: 'caderneta', label: 'Caderneta', icon: ClipboardCheck },
    { id: 'planos-aula', label: 'Planos de Aula', icon: BookOpen },
    { id: 'avaliacoes', label: 'Fichas de Avaliação', icon: FileSignature },
    { id: 'recursos', label: 'Recursos', icon: FileText },
    { id: 'perfil', label: 'Perfil', icon: User },
  ];

  return (
    <div className={cn(
      "flex flex-col bg-white border-r border-slate-200 transition-all duration-300 font-sans",
      // Desktop: always visible, collapsible
      "hidden md:flex",
      collapsed ? "md:w-16" : "md:w-[260px]",
      // Mobile: fixed drawer overlay
      mobileOpen && "fixed inset-y-0 left-0 z-30 flex w-[260px] shadow-2xl",
    )}>
      <div className="flex items-center justify-between p-4 border-b border-slate-200 h-16">
        {/*!collapsed && (
          <div className="flex items-center">
            <img src={yhankoLogo} alt="Yhanko Logo" className="h-8 w-auto object-contain" />
          </div>
        )*/}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0 bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <nav className={cn("py-4", collapsed ? "px-2" : "px-4")}>
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={cn(
                  "relative flex items-center w-full mb-1 h-10 rounded-md transition-colors text-sm font-medium",
                  collapsed ? "justify-center px-0" : "px-3",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
                onClick={() => {
                  onTabChange(item.id)
                  navigate("/" + item.id)
                }}
              >
                {/* Active Indicator Bar */}
                {isActive && !collapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 bg-primary rounded-r-full" />
                )}
                {isActive && collapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
                )}

                <div className={cn("relative flex items-center justify-center", !collapsed && "mr-3")}>
                  <item.icon className={cn(
                    "h-[18px] w-[18px] transition-colors",
                    isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                  )} />
                </div>

                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <Badge variant="sucess" className="h-5 min-w-5 p-0 px-1.5 text-[11px] rounded-full bg-primary text-primary-foreground border-none">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-slate-200">
        <button
          className={cn(
            "flex items-center w-full h-10 rounded-md text-sm font-medium transition-colors",
            "border border-transparent hover:bg-red-50 text-red-600",
            collapsed ? "justify-center px-0" : "px-3"
          )}
          onClick={logout}
        >
          <LogOut className={cn("h-[18px] w-[18px] text-red-500", !collapsed && "mr-3")} />
          {!collapsed && <span className="flex-1 text-left">Terminar Sessão</span>}
        </button>
      </div>
    </div>
  );
}