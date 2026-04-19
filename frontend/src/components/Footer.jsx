import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Link, Typography } from '@mui/material'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        textAlign: 'center',
        borderTop: '1px solid',
        borderColor: 'divider',
        mt: 'auto',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {t('about.poweredBy')}{' '}
        <Link
          href="https://github.com/ILoveScratch2/Luogu-Contest-Reminder"
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          sx={{ fontWeight: 600 }}
        >
          Luogu-Contest-Reminder
        </Link>
      </Typography>
    </Box>
  )
}
