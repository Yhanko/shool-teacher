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

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// Items are defined inside the component to access dynamic counts

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
      "flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
      // Desktop: always visible, collapsible
      "hidden md:flex",
      collapsed ? "md:w-16" : "md:w-64",
      // Mobile: fixed drawer overlay
      mobileOpen && "fixed inset-y-0 left-0 z-30 flex w-64 shadow-2xl",
    )}>
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <h1 className="text-sm font-bold text-gray-900">Portal do Educador</h1>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0 bg-transparent"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <nav className={cn("p-2", collapsed && "px-1")}>
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-center mb-1 h-10 bg-white text-blue-700 border border-gray-300 hover:text-blue-700",
                collapsed && "px-2",
                activeTab === item.id && "bg-blue-600 text-white hover:bg-blue-700"
              )}
              onClick={() => {
                onTabChange(item.id)
                navigate("/"+ item.id)
              }}
            >
              <item.icon className={cn("h-4 w-4", !collapsed && "mr-3")} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <Badge variant="destructive" className="h-5 w-5 p-0 pl-1 text-xs rounded-full">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          ))}
        </nav>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <Button
          variant="destructive"
          className={cn(
            "w-full justify-center h-10 bg-red-50 text-red-600 hover:bg-red-100 border-none shadow-none",
            collapsed && "px-2"
          )}
          onClick={logout}
        >
          <LogOut className={cn("h-4 w-4", !collapsed && "mr-3")} />
          {!collapsed && <span className="flex-1 text-left font-medium">Sair da Conta</span>}
        </Button>
      </div>
    </div>
  );
}