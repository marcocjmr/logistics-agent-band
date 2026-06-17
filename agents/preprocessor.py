import logging
from datetime import datetime
from typing import Any

from band.core.protocols import Preprocessor
from band.core.types import AgentInput, HistoryProvider, PlatformMessage
from band.platform.event import MessageEvent, PlatformEvent
from band.runtime.execution import ExecutionContext
from band.runtime.tools import AgentTools
from band.runtime.formatters import format_history_for_llm
from band.integrations.base import check_and_format_participants

logger = logging.getLogger("CustomPreprocessor")

class CustomPreprocessor(Preprocessor):
    """
    Custom preprocessor that does NOT filter out messages sent by the agent itself.
    This allows running multiple agent characters (Ingestion, Transit, Lodging, Auditor)
    on the same single Band.ai Agent credentials and ID.
    """

    async def process(
        self,
        ctx: ExecutionContext,
        event: PlatformEvent,
        agent_id: str,
    ) -> AgentInput | None:
        match event:
            case MessageEvent(room_id=room_id, payload=msg_data):
                pass
            case _:
                return None

        if msg_data is None:
            return None

        if not room_id:
            logger.error("MessageEvent has no room_id - cannot process")
            return None

        # Custom: DO NOT skip messages from self!
        # This allows multiple agents running under the same agent credentials to receive each other's messages.
        
        # Look up sender name
        sender_name = self._lookup_sender_name(ctx, msg_data.sender_id)

        # Convert to PlatformMessage
        msg = PlatformMessage(
            id=msg_data.id,
            room_id=room_id,
            content=msg_data.content,
            sender_id=msg_data.sender_id,
            sender_type=msg_data.sender_type,
            sender_name=sender_name,
            message_type=msg_data.message_type,
            metadata=msg_data.metadata,
            created_at=datetime.fromisoformat(
                msg_data.inserted_at.replace("Z", "+00:00")
            ),
        )

        is_bootstrap = not ctx.is_llm_initialized

        raw_history: list[dict[str, Any]] = []
        if is_bootstrap:
            if ctx.config.enable_context_hydration:
                raw_history = await self._load_history(ctx, msg)
            ctx.mark_llm_initialized()

        participants_msg = check_and_format_participants(ctx)
        contacts_msg = self._drain_system_messages(ctx)
        tools = AgentTools.from_context(ctx)

        return AgentInput(
            msg=msg,
            tools=tools,
            history=HistoryProvider(raw=raw_history),
            participants_msg=participants_msg,
            contacts_msg=contacts_msg,
            is_session_bootstrap=is_bootstrap,
            room_id=room_id,
        )

    def _drain_system_messages(self, ctx: ExecutionContext) -> str | None:
        messages = ctx.get_pending_system_messages()
        if not messages:
            return None
        return "\n".join(messages)

    def _lookup_sender_name(self, ctx: ExecutionContext, sender_id: str) -> str | None:
        for participant in ctx.participants:
            if participant.get("id") == sender_id:
                return participant.get("name")
        return None

    async def _load_history(
        self,
        ctx: ExecutionContext,
        msg: PlatformMessage,
    ) -> list[dict[str, Any]]:
        try:
            logger.info("Room %s: Loading history...", ctx.room_id)
            context = await ctx.get_context()
            history = format_history_for_llm(
                context.messages,
                exclude_id=msg.id,
                participants=ctx.participants,
            )
            return history or []
        except Exception as e:
            logger.warning("Room %s: Failed to load history: %s", ctx.room_id, e)
            return []
