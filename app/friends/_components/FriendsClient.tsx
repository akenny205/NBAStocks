"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { fmt } from "@/lib/format";

type Friend = {
  friendshipId: string;
  id: string;
  name: string | null;
  email: string;
  positionsCount: number;
  positionsValue: number;
  gainLoss: number;
  gainLossPct: number;
};

type PendingIncoming = {
  friendshipId: string;
  requester: { id: string; name: string | null; email: string };
};

type PendingOutgoing = {
  friendshipId: string;
  addressee: { id: string; name: string | null; email: string };
};

type FriendPosition = {
  id: string;
  player: { id: number; name: string; isActive: boolean };
  shares: number;
  avgBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPct: number;
};

function getInitials(name: string | null, email: string) {
  const src = name ?? email;
  return src.split(/[\s@.]+/).filter(Boolean).map((s) => s[0].toUpperCase()).slice(0, 2).join("");
}

function Avatar({ name, email, size = "md" }: { name: string | null; email: string; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "w-14 h-14 text-base" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${cls} rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-bold flex items-center justify-center flex-shrink-0`}>
      {getInitials(name, email)}
    </div>
  );
}

export function FriendsClient() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<PendingIncoming[]>([]);
  const [outgoing, setOutgoing] = useState<PendingOutgoing[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [positions, setPositions] = useState<FriendPosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);

  const [friendSearch, setFriendSearch] = useState("");

  const [addEmail, setAddEmail] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  const [respondingId, setRespondingId] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      setFriends(data.friends ?? []);
      setIncoming(data.incoming ?? []);
      setOutgoing(data.outgoing ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  async function loadPositions(friend: Friend) {
    if (selectedFriend?.id === friend.id) {
      setSelectedFriend(null);
      setPositions([]);
      return;
    }
    setSelectedFriend(friend);
    setPositions([]);
    setPositionsLoading(true);
    try {
      const res = await fetch(`/api/friends/${friend.id}`);
      setPositions(await res.json());
    } finally {
      setPositionsLoading(false);
    }
  }

  async function sendRequest(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);
    setAddLoading(true);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error); return; }
      setAddSuccess(`Request sent to ${data.addressee.name ?? data.addressee.email}`);
      setAddEmail("");
      loadFriends();
    } finally {
      setAddLoading(false);
    }
  }

  async function respond(friendshipId: string, action: "accept" | "decline") {
    setRespondingId(friendshipId);
    try {
      await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action }),
      });
      loadFriends();
      if (action === "decline" && selectedFriend) {
        const declined = incoming.find((i) => i.friendshipId === friendshipId);
        if (declined?.requester.id === selectedFriend.id) {
          setSelectedFriend(null);
          setPositions([]);
        }
      }
    } finally {
      setRespondingId(null);
    }
  }

  if (loading) {
    return (
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-zinc-900/50 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      {/* Left panel */}
      <div className="lg:col-span-1 space-y-6">

        {/* Add friend */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Add Friend</h2>
          <form onSubmit={sendRequest} className="space-y-2">
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="friend@example.com"
              className="w-full bg-zinc-900 border border-zinc-800/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
            <button
              type="submit"
              disabled={addLoading || !addEmail}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {addLoading ? "Sending…" : "Send Request"}
            </button>
          </form>
          {addError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-2">{addError}</p>
          )}
          {addSuccess && (
            <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 mt-2">{addSuccess}</p>
          )}
        </div>

        {/* Incoming requests */}
        {incoming.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Requests · {incoming.length}
            </h2>
            <div className={`border border-orange-500/20 rounded-xl overflow-hidden divide-y divide-orange-500/10 ${
              incoming.length > 5 ? "max-h-72 overflow-y-auto" : ""
            }`}>
              {incoming.map((req) => (
                <div key={req.friendshipId} className="bg-orange-500/5 px-3 py-2.5 flex items-center gap-3">
                  <Avatar name={req.requester.name} email={req.requester.email} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{req.requester.name ?? req.requester.email}</p>
                    {req.requester.name && <p className="text-xs text-zinc-500 truncate">{req.requester.email}</p>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => respond(req.friendshipId, "accept")}
                      disabled={respondingId === req.friendshipId}
                      className="px-2.5 py-1 bg-green-500/15 hover:bg-green-500/25 text-green-400 text-xs font-semibold rounded-md border border-green-500/20 transition-colors disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respond(req.friendshipId, "decline")}
                      disabled={respondingId === req.friendshipId}
                      className="px-2.5 py-1 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 text-xs font-semibold rounded-md border border-zinc-700/50 transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sent / pending outgoing */}
        {outgoing.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Sent</h2>
            <div className={`border border-zinc-800/50 rounded-xl overflow-hidden divide-y divide-zinc-800/50 ${
              outgoing.length > 5 ? "max-h-48 overflow-y-auto" : ""
            }`}>
              {outgoing.map((req) => (
                <div key={req.friendshipId} className="px-3 py-2.5 flex items-center gap-3">
                  <Avatar name={req.addressee.name} email={req.addressee.email} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{req.addressee.name ?? req.addressee.email}</p>
                    <p className="text-xs text-zinc-600">Pending</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-yellow-500/60 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends list */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Friends · {friends.length}
            </h2>
          </div>

          {friends.length === 0 ? (
            <div className="border border-zinc-800/50 rounded-xl px-4 py-8 text-center">
              <p className="text-zinc-600 text-sm">No friends yet</p>
              <p className="text-zinc-700 text-xs mt-1">Add someone above to get started</p>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                placeholder="Search friends…"
                className="w-full bg-zinc-900 border border-zinc-800/60 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors mb-2"
              />
              <div className="overflow-y-auto max-h-[min(480px,calc(100vh-480px))] border border-zinc-800/50 rounded-xl divide-y divide-zinc-800/50">
                {friends
                  .filter((f) => {
                    const q = friendSearch.toLowerCase();
                    return !q || (f.name ?? f.email).toLowerCase().includes(q);
                  })
                  .map((friend) => {
                    const isSelected = selectedFriend?.id === friend.id;
                    const isUp = friend.gainLoss >= 0;
                    return (
                      <button
                        key={friend.id}
                        onClick={() => loadPositions(friend)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
                          isSelected ? "bg-orange-500/8" : "hover:bg-zinc-900/60"
                        }`}
                      >
                        <Avatar name={friend.name} email={friend.email} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate leading-tight">
                            {friend.name ?? friend.email}
                          </p>
                          <p className="text-xs text-zinc-600 truncate">
                            {friend.positionsCount} position{friend.positionsCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                        {friend.positionsCount > 0 && (
                          <span className={`text-xs font-bold tabular-nums flex-shrink-0 ${
                            isUp ? "text-green-400" : "text-red-400"
                          }`}>
                            {isUp ? "+" : "-"}${fmt(Math.abs(friend.gainLoss))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                {friends.filter((f) => {
                  const q = friendSearch.toLowerCase();
                  return !q || (f.name ?? f.email).toLowerCase().includes(q);
                }).length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-zinc-600 text-sm">No results for "{friendSearch}"</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right panel — friend's positions */}
      <div className="lg:col-span-2">
        {selectedFriend ? (
          <div>
            <div className="flex items-center gap-4 mb-5">
              <Avatar name={selectedFriend.name} email={selectedFriend.email} size="lg" />
              <div>
                <h2 className="text-lg font-bold text-white">{selectedFriend.name ?? selectedFriend.email}</h2>
                <p className="text-sm text-zinc-500">
                  {selectedFriend.positionsCount} position{selectedFriend.positionsCount !== 1 ? "s" : ""}
                  {selectedFriend.positionsValue > 0 && (
                    <> · <span className="text-white font-medium">${fmt(selectedFriend.positionsValue)}</span> invested</>
                  )}
                </p>
              </div>
            </div>

            {positionsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-zinc-900/40 animate-pulse" />
                ))}
              </div>
            ) : positions.length === 0 ? (
              <div className="border border-zinc-800/50 rounded-xl px-6 py-16 text-center">
                <p className="text-zinc-600 text-sm">No open positions</p>
              </div>
            ) : (
              <div className="border border-zinc-800/50 rounded-xl overflow-hidden divide-y divide-zinc-800/50">
                {positions.map((pos) => {
                  const isUp = pos.gainLoss >= 0;
                  return (
                    <div
                      key={pos.id}
                      className={`flex items-center gap-3 pl-0 pr-4 py-3.5 hover:bg-zinc-900/40 transition-colors border-l-2 ${
                        isUp ? "border-l-green-500" : "border-l-red-500"
                      }`}
                    >
                      <Link href={`/players/${pos.player.id}`} className="flex-1 min-w-0 pl-4">
                        <div className="text-sm font-semibold text-white truncate">{pos.player.name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {fmt(pos.shares)} sh · <span className="text-zinc-400">${fmt(pos.currentPrice)}</span>
                        </div>
                      </Link>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-white tabular-nums">${fmt(pos.currentValue)}</div>
                        <span className={`inline-block text-xs font-bold tabular-nums px-1.5 py-0.5 rounded mt-0.5 ${
                          isUp ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                        }`}>
                          {isUp ? "+" : ""}{pos.gainLossPct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="border border-zinc-800/50 rounded-xl flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl mb-4">
              👥
            </div>
            <p className="text-zinc-500 text-sm">Select a friend to see their positions</p>
          </div>
        )}
      </div>
    </div>
  );
}
