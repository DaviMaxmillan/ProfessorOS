'use client'

import React, { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { ChevronRight, BookOpen, Users, Clock, GripVertical } from 'lucide-react'
import { updateClassOrderAction } from '@/app/actions/classes'
import type { ClassSortable } from '@/lib/types'

interface ClassSortableItemProps {
  c: ClassSortable
}

function SortableItem({ c }: ClassSortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: c.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="glass-panel class-card" style={{
        padding: '20px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: isDragging ? 'rgba(30, 41, 59, 0.9)' : undefined,
        boxShadow: isDragging ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)' : undefined,
        border: isDragging ? '1px solid var(--accent)' : undefined,
        transition: isDragging ? 'none' : 'all 0.2s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          <div {...listeners} style={{ cursor: 'grab', padding: '8px', marginLeft: '-12px', color: 'var(--text-secondary)' }}>
            <GripVertical size={20} />
          </div>

          <Link href={`/dashboard/classes/${c.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px',
              background: 'rgba(165, 180, 252, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)', flexShrink: 0
            }}>
              <BookOpen size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {c.subject.name}{c.turmaName ? ` — ${c.turmaName}` : ''}
              </h3>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <Users size={14} />
                  {c._count.enrollments} {c._count.enrollments === 1 ? 'aluno' : 'alunos'}
                </span>
                {c.schedule && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <Clock size={14} />
                    {c.schedule}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </div>
        
        <Link href={`/dashboard/classes/${c.id}`} style={{ display: 'flex', alignItems: 'center', padding: '8px' }}>
          <ChevronRight size={24} color="var(--text-secondary)" />
        </Link>
      </div>
    </div>
  )
}

export default function ClassSortableList({ initialClasses }: { initialClasses: ClassSortable[] }) {
  const [classes, setClasses] = useState(initialClasses)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setClasses((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        
        const newArray = arrayMove(items, oldIndex, newIndex)
        
        // Dispara o salvamento no banco sem bloquear a interface
        updateClassOrderAction(newArray.map(c => c.id))
        
        return newArray
      })
    }
  }

  if (classes.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
        <p style={{ marginBottom: '8px' }}>Nenhuma turma neste semestre.</p>
        <p style={{ fontSize: '0.85rem' }}>Clique em “Nova Turma” para adicionar.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <GripVertical size={14} /> Segure no ícone ao lado esquerdo da turma e arraste para reordenar. A nova ordem é salva automaticamente.
      </p>
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={classes.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {classes.map((c) => (
            <SortableItem key={c.id} c={c} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
