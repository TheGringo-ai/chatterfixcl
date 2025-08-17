import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, Clock, 
  MapPin, User, AlertTriangle, CheckCircle,
  Download, Bell, Filter, Search
} from 'lucide-react';
import { usePMSchedule, getPMTaskStatusColor, formatDuration, isTaskOverdue, isDueSoon } from '../hooks/usePreventiveMaintenance';
import { PMScheduleEntry } from '../api/client';

interface PMCalendarViewProps {
  onTaskClick?: (task: PMScheduleEntry) => void;
}

const PMCalendarView: React.FC<PMCalendarViewProps> = ({ onTaskClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'due' | 'overdue' | 'high-priority'>('all');

  // Calculate date range for API call
  const { startDate, endDate } = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (view === 'month') {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    } else if (view === 'week') {
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      end.setDate(start.getDate() + 6);
    } else {
      // day view
      end.setDate(end.getDate() + 1);
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }, [currentDate, view]);

  const { data: scheduleEntries = [] } = usePMSchedule({
    startDate,
    endDate
  });

  // Filter entries
  const filteredEntries = useMemo(() => {
    return scheduleEntries.filter(entry => {
      switch (selectedFilter) {
        case 'due':
          return entry.status === 'DUE' || isDueSoon(entry.dueDate);
        case 'overdue':
          return entry.status === 'OVERDUE' || isTaskOverdue(entry.dueDate);
        case 'high-priority':
          return entry.priority === 'HIGH' || entry.priority === 'CRITICAL';
        default:
          return true;
      }
    });
  }, [scheduleEntries, selectedFilter]);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const grouped: Record<string, PMScheduleEntry[]> = {};
    filteredEntries.forEach(entry => {
      const date = new Date(entry.scheduledDate).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    });
    return grouped;
  }, [filteredEntries]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const exportCalendar = () => {
    // Generate iCal format
    const icalData = generateICalData(filteredEntries);
    const blob = new Blob([icalData], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'preventive-maintenance-schedule.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getDateFormatString = () => {
    if (view === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (view === 'week') {
      const start = new Date(currentDate);
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">PM Schedule</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={goToToday}
              className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
            >
              Today
            </button>
            <button
              onClick={exportCalendar}
              className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </button>
          </div>
        </div>

        {/* Navigation and View Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg font-semibold text-gray-900 min-w-max">
              {getDateFormatString()}
            </h3>
            
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Toggle */}
            <div className="flex rounded-lg border border-gray-300">
              {['month', 'week', 'day'].map((viewType) => (
                <button
                  key={viewType}
                  onClick={() => setView(viewType as any)}
                  className={`px-3 py-2 text-sm font-medium capitalize ${
                    view === viewType
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  } ${viewType === 'month' ? 'rounded-l-lg' : viewType === 'day' ? 'rounded-r-lg' : ''}`}
                >
                  {viewType}
                </button>
              ))}
            </div>

            {/* Filter */}
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Tasks</option>
              <option value="due">Due Soon</option>
              <option value="overdue">Overdue</option>
              <option value="high-priority">High Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="p-6">
        {view === 'month' && <MonthView entriesByDate={entriesByDate} currentDate={currentDate} onTaskClick={onTaskClick} />}
        {view === 'week' && <WeekView entriesByDate={entriesByDate} currentDate={currentDate} onTaskClick={onTaskClick} />}
        {view === 'day' && <DayView entries={entriesByDate[currentDate.toDateString()] || []} onTaskClick={onTaskClick} />}
      </div>

      {/* Legend */}
      <div className="px-6 pb-6">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span>Due</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span>Overdue</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span>Scheduled</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Month View Component
const MonthView: React.FC<{
  entriesByDate: Record<string, PMScheduleEntry[]>;
  currentDate: Date;
  onTaskClick?: (task: PMScheduleEntry) => void;
}> = ({ entriesByDate, currentDate, onTaskClick }) => {
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const days = [];
  
  // Empty cells for days before the month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="min-h-[120px] bg-gray-50"></div>);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateKey = date.toDateString();
    const dayEntries = entriesByDate[dateKey] || [];
    const isToday = date.toDateString() === new Date().toDateString();
    
    days.push(
      <div key={day} className={`min-h-[120px] border border-gray-200 p-2 ${isToday ? 'bg-blue-50' : 'bg-white'}`}>
        <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
          {day}
        </div>
        <div className="space-y-1">
          {dayEntries.slice(0, 3).map((entry, index) => (
            <div
              key={entry.id}
              onClick={() => onTaskClick?.(entry)}
              className={`text-xs p-1 rounded cursor-pointer truncate ${getPMTaskStatusColor(entry.status)} hover:opacity-80`}
              title={entry.pmTaskName}
            >
              {entry.pmTaskName}
            </div>
          ))}
          {dayEntries.length > 3 && (
            <div className="text-xs text-gray-500">
              +{dayEntries.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
      {/* Day headers */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="bg-gray-100 p-3 text-center text-sm font-medium text-gray-700 border-b border-gray-200">
          {day}
        </div>
      ))}
      {days}
    </div>
  );
};

// Week View Component
const WeekView: React.FC<{
  entriesByDate: Record<string, PMScheduleEntry[]>;
  currentDate: Date;
  onTaskClick?: (task: PMScheduleEntry) => void;
}> = ({ entriesByDate, currentDate, onTaskClick }) => {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(day.getDate() + i);
    weekDays.push(day);
  }
  
  return (
    <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
      {/* Day headers */}
      {weekDays.map(day => (
        <div key={day.toDateString()} className="bg-gray-100 p-3 text-center border-b border-gray-200">
          <div className="text-sm font-medium text-gray-700">
            {day.toLocaleDateString('en-US', { weekday: 'short' })}
          </div>
          <div className={`text-lg font-semibold ${day.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-gray-900'}`}>
            {day.getDate()}
          </div>
        </div>
      ))}
      
      {/* Day content */}
      {weekDays.map(day => {
        const dayEntries = entriesByDate[day.toDateString()] || [];
        return (
          <div key={`content-${day.toDateString()}`} className="min-h-[200px] p-2 border-r border-gray-200 last:border-r-0">
            <div className="space-y-1">
              {dayEntries.map(entry => (
                <div
                  key={entry.id}
                  onClick={() => onTaskClick?.(entry)}
                  className={`text-xs p-2 rounded cursor-pointer ${getPMTaskStatusColor(entry.status)} hover:opacity-80`}
                >
                  <div className="font-medium truncate">{entry.pmTaskName}</div>
                  <div className="flex items-center mt-1 text-xs opacity-75">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDuration(entry.estimatedDuration)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Day View Component
const DayView: React.FC<{
  entries: PMScheduleEntry[];
  onTaskClick?: (task: PMScheduleEntry) => void;
}> = ({ entries, onTaskClick }) => {
  return (
    <div className="space-y-3">
      {entries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No scheduled tasks for this day</p>
        </div>
      ) : (
        entries.map(entry => (
          <div
            key={entry.id}
            onClick={() => onTaskClick?.(entry)}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-gray-900">{entry.pmTaskName}</h3>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPMTaskStatusColor(entry.status)}`}>
                {entry.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                {entry.assetName}
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                {formatDuration(entry.estimatedDuration)}
              </div>
              {entry.assignedTo && (
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  {entry.assignedTo}
                </div>
              )}
              <div className="flex items-center">
                <span className={`w-4 h-4 mr-2 ${entry.priority === 'HIGH' || entry.priority === 'CRITICAL' ? 'text-red-500' : entry.priority === 'MEDIUM' ? 'text-yellow-500' : 'text-green-500'}`}>
                  {entry.priority === 'HIGH' || entry.priority === 'CRITICAL' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                </span>
                {entry.priority} Priority
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// iCal generation helper
function generateICalData(entries: PMScheduleEntry[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ChatterFix CMMS//PM Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  entries.forEach(entry => {
    const startDate = new Date(entry.scheduledDate);
    const endDate = new Date(startDate.getTime() + entry.estimatedDuration * 60000);
    
    lines.push(
      'BEGIN:VEVENT',
      `UID:${entry.id}@chatterfix.com`,
      `DTSTART:${formatICalDate(startDate)}`,
      `DTEND:${formatICalDate(endDate)}`,
      `SUMMARY:${entry.pmTaskName}`,
      `DESCRIPTION:Preventive maintenance task for ${entry.assetName}`,
      `LOCATION:${entry.assetName}`,
      `STATUS:${entry.status === 'COMPLETED' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export default PMCalendarView;