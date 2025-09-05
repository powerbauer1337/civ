import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { Box, Typography, Chip, Paper, Avatar, Stack } from '@mui/material';

const statusColor: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  neutral: 'default',
  peace: 'success',
  alliance: 'info',
  war: 'error'
};

const DiplomacyPanel: React.FC = () => {
  const { gameState } = useSelector((s: RootState) => s.game);
  const { user } = useSelector((s: RootState) => s.auth);

  const relations = useMemo(() => {
    if (!gameState?.diplomacy || !user?.id) return [] as { id: string; name: string; color: string; status: string }[];

    const entries = Object.entries(gameState.diplomacy);
    const withMe = entries.filter(([, rel]: any) => rel.a === user.id || rel.b === user.id);

    return withMe.map(([, rel]: any) => {
      const otherId = rel.a === user.id ? rel.b : rel.a;
      const other = gameState.players.find(p => p.id === otherId || (p as any).userId === otherId) as any;
      return {
        id: otherId,
        name: other?.name || other?.username || otherId,
        color: other?.color || '#888',
        status: rel.status
      };
    });
  }, [gameState?.diplomacy, gameState?.players, user?.id]);

  if (!gameState) return null;

  return (
    <Box>
      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Diplomacy</Typography>
      {relations.length === 0 ? (
        <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>
          No known relations yet.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {relations.map(r => (
            <Paper key={r.id} sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.08)' }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Avatar sx={{ bgcolor: r.color }}>{r.name?.[0] || '?'}</Avatar>
                <Box flex={1}>
                  <Typography sx={{ color: 'white', fontWeight: 'bold' }}>{r.name}</Typography>
                </Box>
                <Chip label={r.status.toUpperCase()} color={statusColor[r.status] || 'default'} size="small" />
              </Box>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default DiplomacyPanel;
