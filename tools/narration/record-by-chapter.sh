#!/bin/bash
# Records the missing clips one chapter at a time: the exam questions first, then the topic animations.
# Two jobs at once (a third fills a 24 GB GPU and all of them stall), restarted every 150 clips (long runs get slower).
# Safe to stop and start again: it only records what is missing.
# Usage: PY=/path/to/venv/python tools/narration/record-by-chapter.sh [questions] [topics]
cd "$(dirname "$0")/../.." || exit 1
PY=${PY:-python}
BATCH=${BATCH:-150}
LOG=tools/narration/log-progress.txt
say() { echo "$(date '+%m-%d %H:%M') $*" | tee -a "$LOG"; }

# How many clips of this kind and chapter are still missing. With no chapter: the list of chapters, in order.
missing() {
  node -e "
    const fs = require('fs'), [kind, ch] = process.argv.slice(1);
    const lines = JSON.parse(fs.readFileSync('tools/narration/' + kind + '.json', 'utf8'));
    const dest = l => 'src/PatenteB.Web/wwwroot/audio/' + (kind === 'questions' ? 'questions/' : 'topics/' + l.lang + '/') + l.key + '.ogg';
    if (!ch) console.log([...new Set(lines.map(l => l.ch))].join(' '));
    else console.log(lines.filter(l => l.ch === ch && !fs.existsSync(dest(l))).length);
  " "$@"
}

kinds=("$@")
[ ${#kinds[@]} -eq 0 ] && kinds=(questions topics)
for kind in "${kinds[@]}"; do
  for ch in $(missing "$kind"); do
    left=$(missing "$kind" "$ch"); stuck=0
    [ "$left" -eq 0 ] && continue
    say "$kind: $ch: $left to record"
    while [ "$left" -gt 0 ] && [ "$stuck" -lt 3 ]; do
      for shard in 0/2 1/2; do
        tag=${shard/\//of}
        NARRATION_CHAPTER=$ch NARRATION_SHARD=$shard NARRATION_LIMIT=$BATCH PYTHONIOENCODING=utf-8 PYTHONUNBUFFERED=1 \
          "$PY" tools/narration/make-audio.py "$kind" >"tools/narration/log-$kind-$tag.txt" 2>"tools/narration/log-$kind-$tag.err.txt" &
      done
      wait
      now=$(missing "$kind" "$ch")
      if [ "$now" -ge "$left" ]; then stuck=$((stuck + 1)); say "$kind: $ch: no progress ($stuck of 3): $(tail -c 200 "tools/narration/log-$kind-0of2.err.txt" | tr '\r\n' '  ')"; else stuck=0; fi
      left=$now
      say "$kind: $ch: $left left"
    done
    [ "$left" -gt 0 ] && say "$kind: $ch: GAVE UP with $left missing"
  done
  say "$kind: all chapters done"
done
