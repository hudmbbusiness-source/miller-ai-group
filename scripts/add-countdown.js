const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update imports
content = content.replace(
  /DollarSign,\n\s+BarChart3,\n\s+Scissors,/,
  'Scissors,'
);
content = content.replace(
  /X,\n\s+Play,\n\} from 'lucide-react'/,
  "X,\n  Clock,\n} from 'lucide-react'"
);

// 2. Add countdown state
content = content.replace(
  "const [isProcessingAuth, setIsProcessingAuth] = useState(false)",
  "const [isProcessingAuth, setIsProcessingAuth] = useState(false)\n  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })"
);

// 3. Add countdown useEffect before auth useEffect
const countdownEffect = `// 24-hour countdown that resets at midnight
  useEffect(() => {
    const calculateTimeToMidnight = () => {
      const now = new Date()
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      const diff = midnight.getTime() - now.getTime()

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setCountdown({ hours, minutes, seconds })
    }

    calculateTimeToMidnight()
    const interval = setInterval(calculateTimeToMidnight, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {`;

content = content.replace(
  /useEffect\(\(\) => \{\n\s+const code = searchParams\.get\('code'\)/,
  countdownEffect + "\n    const code = searchParams.get('code')"
);

// 4. Add formatTime function
content = content.replace(
  "if (isProcessingAuth) {",
  "const formatTime = (num: number) => num.toString().padStart(2, '0')\n\n  if (isProcessingAuth) {"
);

// 5. Add countdown timer section to Early Access
const countdownTimerUI = `<p className="text-neutral-400 mb-6">
            Early supporters will receive free access when we launch.
            Standard pricing will be $23.99/month.
          </p>

          {/* Countdown Timer */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/30 bg-red-500/10 mb-3">
              <Clock className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">Limited Time Offer</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 min-w-[70px]">
                <div className="text-2xl font-bold text-white font-mono">{formatTime(countdown.hours)}</div>
                <div className="text-xs text-neutral-500 uppercase">Hours</div>
              </div>
              <span className="text-2xl text-neutral-600 font-bold">:</span>
              <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 min-w-[70px]">
                <div className="text-2xl font-bold text-white font-mono">{formatTime(countdown.minutes)}</div>
                <div className="text-xs text-neutral-500 uppercase">Minutes</div>
              </div>
              <span className="text-2xl text-neutral-600 font-bold">:</span>
              <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 min-w-[70px]">
                <div className="text-2xl font-bold text-white font-mono">{formatTime(countdown.seconds)}</div>
                <div className="text-xs text-neutral-500 uppercase">Seconds</div>
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-3">Offer resets daily at midnight</p>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8">`;

content = content.replace(
  /<p className="text-neutral-400 mb-8">\s+Early supporters will receive free access when we launch\.\s+Standard pricing will be \$23\.99\/month\.\s+<\/p>\s+<div className="bg-neutral-900\/50 border border-neutral-800 rounded-2xl p-8">/,
  countdownTimerUI
);

// 6. Add countdown in modal
const modalCountdown = `<div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">`;

content = content.replace(
  /<div className="flex items-center justify-between mb-6">\s+<div className="flex items-center gap-3">/,
  modalCountdown
);

const modalCountdownTimer = `</button>
                </div>

                {/* Countdown in modal */}
                <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <Clock className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400">
                    Offer expires in {formatTime(countdown.hours)}:{formatTime(countdown.minutes)}:{formatTime(countdown.seconds)}
                  </span>
                </div>

                {submitStatus === 'success' ? (`;

content = content.replace(
  /<\/button>\s+<\/div>\s+\{submitStatus === 'success' \? \(/,
  modalCountdownTimer
);

fs.writeFileSync(filePath, content);
console.log('File updated successfully!');
