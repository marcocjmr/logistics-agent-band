import logging
from swarm_orchestrator import start_server

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("Launcher")

def main():
    logger.info("Initializing corporate travel logistics relocation orchestrator...")
    start_server()

if __name__ == "__main__":
    main()
