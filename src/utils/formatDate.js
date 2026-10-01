export const formatDate = (value) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value))
