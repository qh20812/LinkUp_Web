import { POLL_BACKOFF_STEPS, pollSkipRounds } from "../lib/poll-backoff";

describe("pollSkipRounds", () => {
  it("không bỏ vòng nào khi chưa có lỗi", () => {
    expect(pollSkipRounds(0)).toBe(0);
  });

  it("giãn nhịp tăng dần theo số lần lỗi liên tiếp", () => {
    expect(pollSkipRounds(1)).toBe(1);
    expect(pollSkipRounds(2)).toBe(3);
    expect(pollSkipRounds(3)).toBe(7);
    expect(pollSkipRounds(4)).toBe(15);
  });

  it("chặn ở mức giãn lớn nhất khi lỗi kéo dài", () => {
    const max = POLL_BACKOFF_STEPS[POLL_BACKOFF_STEPS.length - 1];
    expect(pollSkipRounds(5)).toBe(max);
    expect(pollSkipRounds(999)).toBe(max);
  });

  it("bỏ qua giá trị không hợp lệ", () => {
    expect(pollSkipRounds(-1)).toBe(0);
    expect(pollSkipRounds(Number.NaN)).toBe(0);
    expect(pollSkipRounds(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("làm tròn số lần lỗi không nguyên", () => {
    expect(pollSkipRounds(1.9)).toBe(1);
    expect(pollSkipRounds(2.5)).toBe(3);
  });
});
