import { Dashboard } from '@/pages/dashboard/Dashboard';
import { NotasPauta } from '@/pages/notas/NotasPauta';
import { CalendarView } from '@/pages/calendar/CalendarView';
import { Chat } from '@/pages/chat/Chat';
import { IAAssistant } from '@/pages/ia/IAAssistant';
import { Notificacoes } from '@/pages/notificacoes/Notificacoes';
import { PlanosAula } from '@/pages/planos/PlanosAula';
import { ProfileView } from "@/pages/profile/ProfileView";
import { ResourcesView } from "@/pages/resources/ResourcesView";
import { Caderneta } from '@/pages/caderneta/Caderneta';
import { Avaliacoes } from '@/pages/avaliacoes/Avaliacoes';

export const privateRoutes = [
    { path: "dashboard", element: (
        <Dashboard />
    ) },
    
    { path: "perfil", element: (
        <ProfileView />
    ) },
    { path: "atividades", element: (
        <CalendarView />
    ) },

    { path: "notificacoes", element: (
        <Notificacoes />
    ) },

    { path: "assistante", element: (
        <IAAssistant />
    ) },

    { path: "chat", element: (
        <Chat />
    ) },

    { path: "planos", element: (
        <PlanosAula />
    ) },

    { path: "planos-aula", element: (
        <PlanosAula />
    ) },

    { path: "avaliacoes", element: (
        <Avaliacoes />
    ) },

    { path: "notas", element: (
        <NotasPauta />
    ) },

    { path: "caderneta", element: (
        <Caderneta />
    ) },

    { path: "recursos", element: (
        <ResourcesView  />
    ) },
];