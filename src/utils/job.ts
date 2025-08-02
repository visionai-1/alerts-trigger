export function formatCronInterval(cron: string): string {
    const [min, hour, dayOfMonth, month, dayOfWeek] = cron.trim().split(' ');
  
    const isEveryX = (val: string) => val.startsWith('*/') && !isNaN(Number(val.slice(2)));
  
    // Handle every X minutes
    if (isEveryX(min) && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return `every ${min.slice(2)} minutes`;
    }
  
    // Handle every hour at specific minute
    if (!isNaN(Number(min)) && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return `every hour at minute ${min}`;
    }
  
    // Handle daily at specific time
    if (!isNaN(Number(min)) && !isNaN(Number(hour)) && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return `every day at ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
  
    // Handle weekly at specific day and time
    if (!isNaN(Number(min)) && !isNaN(Number(hour)) && dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[parseInt(dayOfWeek, 10)] ?? `day ${dayOfWeek}`;
      return `every ${dayName} at ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
  
    return `cron schedule: ${cron}`;
  }
  