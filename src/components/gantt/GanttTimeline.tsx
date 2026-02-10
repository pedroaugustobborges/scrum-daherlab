import { Box, Typography } from '@mui/material'

interface TimelineUnit {
  date: Date
  label: string
  width: number
  isWeekend: boolean
  isToday: boolean
}

interface GanttTimelineProps {
  units: TimelineUnit[]
}

export default function GanttTimeline({ units }: GanttTimelineProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        minWidth: 'max-content',
      }}
    >
      {units.map((unit, index) => (
        <Box
          key={index}
          sx={{
            width: unit.width,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: unit.isToday
              ? 'rgba(239, 68, 68, 0.1)'
              : unit.isWeekend
              ? 'rgba(0, 0, 0, 0.03)'
              : 'transparent',
          }}
        >
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 0.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: unit.isToday ? 700 : 500,
                color: unit.isToday ? 'error.main' : 'text.secondary',
                fontSize: '0.7rem',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {unit.label}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  )
}
