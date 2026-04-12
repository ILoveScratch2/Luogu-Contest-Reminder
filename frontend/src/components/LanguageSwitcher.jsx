import React from 'react'
import { useTranslation } from 'react-i18next'
import { MenuItem, Select, Box } from '@mui/material'
import LanguageIcon from '@mui/icons-material/Language'

export default function LanguageSwitcher({ sx }) {
  const { i18n } = useTranslation()

  const handleChange = (e) => {
    i18n.changeLanguage(e.target.value)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ...sx }}>
      <LanguageIcon fontSize="small" sx={{ color: 'inherit', opacity: 0.8 }} />
      <Select
        value={i18n.language.startsWith('zh') ? 'zh' : 'en'}
        onChange={handleChange}
        variant="standard"
        disableUnderline
        sx={{
          color: 'inherit',
          fontSize: 14,
          '& .MuiSvgIcon-root': { color: 'inherit' },
          '& .MuiSelect-select': { py: 0, pr: '20px !important' },
        }}
      >
        <MenuItem value="zh">简体中文</MenuItem>
        <MenuItem value="en">English</MenuItem>
      </Select>
    </Box>
  )
}
