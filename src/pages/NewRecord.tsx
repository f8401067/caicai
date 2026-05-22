import React, { useState, useMemo, useRef } from 'react';
import { ChevronLeft, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { LotteryType, LOTTERY_CONFIGS, BallNumbers } from '../types';
import { generateRandomNumbers } from '../utils/lottery';
import { extractLotteryNumbers } from '../utils/ocrExtract';
import { baiduOcrRecognize, fileToBase64 } from '../utils/baiduOcr';
import { Ball } from '../components/common/Ball';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

export default function NewRecord() {
  const navigate = useNavigate();
  const { addRecord, drawHistory } = useAppStore();

  // 根据开奖记录自动计算下一期
  const getNextIssue = (): string => {
    const history = drawHistory[selectedType];
    if (!history || history.length === 0) return '24059';
    const maxIssue = Math.max(...history.map(r => parseInt(r.issueno, 10)));
    return String(maxIssue + 1);
  };

  const [selectedType, setSelectedType] = useState<LotteryType>(LotteryType.DALETOU);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [notes, setNotes] = useState<BallNumbers[]>([{ red: [], blue: [] }]);
  const [multiples, setMultiples] = useState(1);
  const [isAppend, setIsAppend] = useState(false);
  const [issues, setIssues] = useState(1);
  const [isReal, setIsReal] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // OCR 拍照识别状态
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMsg, setOcrMsg] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 百度 OCR API 密钥
  const BAIDU_API_KEY = '2wG1155u8JeDa1A9h6tlT8PD';
  const BAIDU_SECRET_KEY = 'oKI4gtuvaqVoUCB2Y6Dhx5gEQ4vBkVvR';

  const config = LOTTERY_CONFIGS[selectedType];
  const currentNote = notes[currentNoteIndex];

  const totalAmount = useMemo(() => {
    let amount = config.price * multiples;
    if (isAppend && config.hasAppend) {
      amount += 1 * multiples;
    }
    return amount * issues * notes.filter(n => n.red.length === config.redCount).length;
  }, [config, multiples, isAppend, issues, notes]);

  const handleRedSelect = (num: number) => {
    const newNotes = [...notes];
    if (newNotes[currentNoteIndex].red.includes(num)) {
      newNotes[currentNoteIndex].red = newNotes[currentNoteIndex].red.filter(n => n !== num);
    } else if (newNotes[currentNoteIndex].red.length < config.redCount) {
      newNotes[currentNoteIndex].red = [...newNotes[currentNoteIndex].red, num].sort((a, b) => a - b);
    }
    setNotes(newNotes);
  };

  const handleBlueSelect = (num: number) => {
    if (config.blueCount === 0) return;
    const newNotes = [...notes];
    if (newNotes[currentNoteIndex].blue.includes(num)) {
      newNotes[currentNoteIndex].blue = newNotes[currentNoteIndex].blue.filter(n => n !== num);
    } else if (newNotes[currentNoteIndex].blue.length < config.blueCount) {
      newNotes[currentNoteIndex].blue = [...newNotes[currentNoteIndex].blue, num].sort((a, b) => a - b);
    }
    setNotes(newNotes);
  };

  const handleQuickPick = () => {
    const newNotes = [...notes];
    const nums = generateRandomNumbers(selectedType);
    newNotes[currentNoteIndex] = nums;
    setNotes(newNotes);
  };

  const handleQuickPickAll = () => {
    const newNotes = notes.map(() => generateRandomNumbers(selectedType));
    setNotes(newNotes);
  };

  const handleAddNote = () => {
    if (notes.length < 10) {
      const newNotes = [...notes, { red: [], blue: [] }];
      setNotes(newNotes);
      setCurrentNoteIndex(notes.length);
      setDrawerOpen(true);
    }
  };

  const handleAdd5Notes = () => {
    const count = Math.min(5, 10 - notes.length);
    if (count <= 0) return;
    const emptyNotes: BallNumbers[] = Array.from({ length: count }, () => ({ red: [], blue: [] }));
    setNotes([...notes, ...emptyNotes]);
  };

  const handleNoteClick = (index: number) => {
    setCurrentNoteIndex(index);
    setDrawerOpen(true);
  };

  const handleRemoveNote = (index: number) => {
    if (notes.length > 1) {
      const newNotes = notes.filter((_, i) => i !== index);
      setNotes(newNotes);
      setCurrentNoteIndex(Math.min(currentNoteIndex, newNotes.length - 1));
    }
  };

  // OCR 拍照识别处理
  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrMsg('正在识别...');

    try {
      const base64 = await fileToBase64(file);
      const ocrText = await baiduOcrRecognize(base64, {
        apiKey: BAIDU_API_KEY,
        secretKey: BAIDU_SECRET_KEY,
      });

      // 检测彩票类型
      const detectResult = extractLotteryNumbers(ocrText, LotteryType.DALETOU);
      let detectedType = LotteryType.DALETOU;
      if (detectResult.lotteryName) {
        const name = detectResult.lotteryName;
        if (name.includes('双色球')) {
          detectedType = LotteryType.SHUANGSEQIU;
        } else if (name.includes('大乐透')) {
          detectedType = LotteryType.DALETOU;
        }
      }

      // 用检测到的类型重新提取
      const result = extractLotteryNumbers(ocrText, detectedType);

      if (result.valid && result.numbersList.length > 0) {
        setSelectedType(detectedType);
        setNotes(result.numbersList);
        setCurrentNoteIndex(0);
        setOcrMsg(`识别成功，共${result.numbersList.length}注`);
        setDrawerOpen(true);
        // 2秒后清除提示
        setTimeout(() => setOcrMsg(''), 2000);
      } else {
        setOcrMsg('识别失败，请重新拍照');
        setTimeout(() => setOcrMsg(''), 3000);
      }
    } catch (err) {
      setOcrMsg('识别失败，请重试');
      setTimeout(() => setOcrMsg(''), 3000);
    } finally {
      setOcrLoading(false);
      e.target.value = '';
    }
  };

  const handleSave = () => {
    const validNotes = notes.filter(n => n.red.length === config.redCount);
    if (validNotes.length === 0) {
      alert('请至少选择一注号码');
      return;
    }

    const perNoteAmount = (config.price * multiples + ((isAppend && config.hasAppend) ? multiples : 0)) * issues;
    const bets = validNotes.map(n => ({ numbers: n }));

    addRecord({
      type: selectedType,
      numbers: validNotes[0],
      bets: bets.length > 1 ? bets : undefined,
      multiples,
      isAppend: isAppend && config.hasAppend,
      issue: getNextIssue(),
      issues,
      amount: perNoteAmount * validNotes.length,
      isReal,
      status: 'pending',
    });

    navigate(-1);
  };

  const isReady = notes.some(n => n.red.length === config.redCount && (config.blueCount === 0 || n.blue.length === config.blueCount));

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-800 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">选择号码</h1>
          </div>
          <div className="flex items-center gap-2">
            {ocrLoading && (
              <span className="text-xs text-amber-400 animate-pulse">{ocrMsg}</span>
            )}
            {!ocrLoading && ocrMsg && (
              <span className={`text-xs ${ocrMsg.includes('失败') ? 'text-red-400' : 'text-green-400'}`}>{ocrMsg}</span>
            )}
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={ocrLoading}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-amber-500 disabled:opacity-50"
              title="拍照识别"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 隐藏的拍照输入 */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />

      <div className="p-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1.5">
          {Object.values(LOTTERY_CONFIGS).slice(0, 4).map((c) => (
            <button
              key={c.type}
              onClick={() => {
                setSelectedType(c.type);
                setNotes([{ red: [], blue: [] }]);
                setCurrentNoteIndex(0);
                setDrawerOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-sm transition-colors ${
                selectedType === c.type ? 'bg-amber-500 text-black font-semibold' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 space-y-3">
        <Card className="p-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">已选 {notes.filter(n => n.red.length === config.redCount).length} 注</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="md" className="text-xs" onClick={handleQuickPickAll}>
                全部机选
              </Button>
              {notes.length < 10 && (
                <>
                  <Button variant="outline" size="md" className="text-xs" onClick={handleAddNote}>
                    +1注
                  </Button>
                  {notes.length <= 5 && (
                    <Button variant="outline" size="md" className="text-xs" onClick={handleAdd5Notes}>
                      +5注
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {notes.map((note, index) => (
              <div
                key={index}
                onClick={() => handleNoteClick(index)}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                  currentNoteIndex === index ? 'bg-amber-500/10 border border-amber-500' : 'bg-gray-800'
                }`}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); handleNoteClick(index); }}
                  className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold"
                >
                  {index + 1}
                </button>
                <div className="flex-1 flex gap-1 flex-wrap">
                  {note.red.length > 0 ? (
                    <>
                      {note.red.map((num, i) => (
                        <Ball key={`r-${index}-${i}`} number={num} type="red" size="md" matched={true} />
                      ))}
                      {note.blue.length > 0 && <div className="w-px h-3 bg-gray-600 mx-0.5" />}
                      {note.blue.map((num, i) => (
                        <Ball key={`b-${index}-${i}`} number={num} type="blue" size="md" matched={true} />
                      ))}
                    </>
                  ) : (
                    <span className="text-gray-500 text-xs">未选择</span>
                  )}
                </div>
                {notes.length > 1 && (
                  <button onClick={(e) => { e.stopPropagation(); handleRemoveNote(index); }} className="text-red-400 text-xs px-1">
                    删除
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-2">
          <h3 className="font-semibold text-xs mb-1.5">购买选项</h3>

          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-gray-400 min-w-[30px]">倍数</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMultiples(Math.max(1, multiples - 1))}
                className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs"
              >
                -
              </button>
              <span className="text-base font-bold min-w-[36px] text-center">{multiples}</span>
              <button
                onClick={() => setMultiples(Math.min(99, multiples + 1))}
                className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs"
              >
                +
              </button>
            </div>

            <span className="text-xs text-gray-400 min-w-[30px] ml-2">期数</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIssues(Math.max(1, issues - 1))}
                className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs"
              >
                -
              </button>
              <span className="text-base font-bold min-w-[36px] text-center">{issues}</span>
              <button
                onClick={() => setIssues(Math.min(99, issues + 1))}
                className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            {config.hasAppend && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">追加</span>
                <button
                  onClick={() => setIsAppend(!isAppend)}
                  className={`w-10 h-5 rounded-full transition-colors ${isAppend ? 'bg-amber-500' : 'bg-gray-600'}`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white ml-px transition-transform ${isAppend ? 'ml-5' : 'ml-px'}`}
                  />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">真实购票</span>
              <button
                onClick={() => setIsReal(!isReal)}
                className={`w-10 h-5 rounded-full transition-colors ${isReal ? 'bg-green-500' : 'bg-gray-600'}`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white ml-px transition-transform ${isReal ? 'ml-5' : 'ml-px'}`}
                />
              </button>
            </div>
          </div>
        </Card>
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-gray-900 border-t border-gray-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">
            {notes.filter(n => n.red.length === config.redCount).length}注 × {multiples}倍 × {issues}期
          </span>
          <span className="text-xl font-bold text-amber-500">¥{totalAmount.toFixed(2)}</span>
        </div>
        <Button className="w-full py-2.5 text-sm" onClick={handleSave} disabled={!isReady}>
          确认保存
        </Button>
      </div>

      {/* 抽屉式号码选择器 */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          {/* 遮罩层 */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          {/* 抽屉面板 */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-xl max-h-[70vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between z-10 rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center text-xs font-bold text-amber-500">
                  {currentNoteIndex + 1}
                </div>
                <h3 className="font-semibold text-sm">编辑第{currentNoteIndex + 1}注</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="md" className="text-xs" onClick={handleQuickPick}>
                  机选
                </Button>
                <span className="text-sm text-gray-400">已选 {notes.filter(n => n.red.length === config.redCount).length} 注</span>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="font-semibold text-sm">
                    红球 <span className="text-red-400">({currentNote.red.length}/{config.redCount})</span>
                  </h4>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: config.redMax }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => handleRedSelect(num)}
                      className={`
                        w-8 h-8 rounded-full font-bold transition-all text-xs leading-none mx-auto
                        ${
                          currentNote.red.includes(num)
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-700 text-white hover:bg-gray-600'
                        }
                      `}
                    >
                      {String(num).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>

              {config.blueCount > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="font-semibold text-sm">
                      蓝球 <span className="text-blue-400">({currentNote.blue.length}/{config.blueCount})</span>
                    </h4>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: config.blueMax }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        onClick={() => handleBlueSelect(num)}
                        className={`
                          w-8 h-8 rounded-full font-bold transition-all text-xs leading-none mx-auto
                          ${
                            currentNote.blue.includes(num)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-700 text-white hover:bg-gray-600'
                          }
                        `}
                      >
                        {String(num).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full py-2.5 text-sm"
                onClick={() => setDrawerOpen(false)}
              >
                完成
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
