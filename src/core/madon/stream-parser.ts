// Buffer incomplete delimiters across arbitrary token boundaries. Never persist thoughts.
export class AnswerParser {
  private pending = "";
  private hidden = false;
  private started = false;
  text = "";
  push(delta: string) {
    this.pending += delta;
    if (!this.started) {
      this.pending = this.pending.trimStart();
      if ("<think>".startsWith(this.pending)) return this.text;
      this.started = true;
    }
    while (this.pending) {
      const marker = this.hidden ? "</think>" : "<think>";
      const at = this.pending.indexOf(marker);
      if (at >= 0) {
        if (!this.hidden) this.text += this.pending.slice(0, at);
        this.pending = this.pending.slice(at + marker.length);
        this.hidden = !this.hidden;
        continue;
      }
      let keep = 0;
      for (let n = 1; n < marker.length; n++)
        if (this.pending.endsWith(marker.slice(0, n))) keep = n;
      const safe = this.pending.slice(0, this.pending.length - keep);
      if (!this.hidden) this.text += safe;
      this.pending = keep ? this.pending.slice(-keep) : "";
      break;
    }
    return this.text.trimStart();
  }
  finish() {
    // Drop incomplete markers and unfinished hidden blocks, including on cancellation.
    this.pending = "";
    return this.text.trim();
  }
}
