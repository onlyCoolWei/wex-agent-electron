import { FolderOpen, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ProjectItem } from '../types';

type SidebarProps = {
  projects: ProjectItem[];
  activeProject: ProjectItem | null;
  status: string;
  onAddProject: () => void;
  onActivateProject: (project: ProjectItem) => void;
};

export function Sidebar({ projects, activeProject, status, onAddProject, onActivateProject }: SidebarProps) {
  return (
    <aside className="bg-sidebar flex w-72 shrink-0 flex-col" aria-label="侧边栏">
      <Card
        className={cn(
          'border-border bg-card border',
          'bg-sidebar text-sidebar-foreground flex-1 gap-5 rounded-none border-0 p-4 shadow-none',
        )}
      >
        <div className="flex gap-2">
          <Button aria-label="新增项目" size="icon-sm" type="button" variant="secondary" onClick={onAddProject}>
            <FolderPlus />
          </Button>
          <Button className="flex-1 justify-start" type="button" variant="secondary" onClick={onAddProject}>
            新增项目
          </Button>
        </div>

        <section className="grid min-h-0 gap-3" aria-label="项目目录">
          <div className="text-bodySmall text-muted-foreground flex items-baseline justify-between tracking-widest">
            <span className="uppercase">项目</span>
            <strong className="text-bodyMedium text-foreground">目录</strong>
          </div>
          <div className="grid gap-2 overflow-auto">
            {projects.map((project) => (
              <button
                className={cn(
                  'text-sidebar-foreground flex w-full gap-2 rounded-2xl border border-transparent bg-transparent p-2.5 text-left transition-colors',
                  'hover:border-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  project.id === activeProject?.id &&
                    'border-sidebar-ring bg-sidebar-accent text-sidebar-accent-foreground',
                )}
                key={project.id}
                type="button"
                onClick={() => onActivateProject(project)}
              >
                <span className="bg-secondary text-brand inline-flex size-8 shrink-0 items-center justify-center rounded-xl">
                  <FolderOpen className="size-4" />
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <strong className="text-bodyMedium block overflow-hidden leading-snug text-ellipsis whitespace-nowrap">
                    {project.name}
                  </strong>
                  <small className="text-bodySmall text-muted-foreground block overflow-hidden text-ellipsis whitespace-nowrap">
                    {project.path}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="bg-muted border-border mt-auto grid gap-1.5 rounded-2xl border p-4">
          <span className="text-bodySmall text-brand font-black tracking-widest uppercase">Status</span>
          <strong className="text-bodySmall text-foreground leading-relaxed">{status}</strong>
        </div>
      </Card>
    </aside>
  );
}
