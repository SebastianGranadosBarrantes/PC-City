# Interactive PC Components Learning Game

An interactive educational game designed to teach students about computer hardware through a creative and engaging experience. Instead of relying solely on traditional lessons, the project uses interactive 3D models and quizzes to help students explore PC components, understand their functions, and learn basic maintenance practices.

**Developed by:** Sebastián Granados Barrantes

## About the Project

Learning about computer hardware can be challenging when students only have access to diagrams or written explanations. This project aims to make the learning process more visual, interactive, and enjoyable.

The application combines a 3D environment with educational content, allowing students to explore computer components, learn about their purpose, and test their knowledge through quizzes.

### Features

- **Interactive 3D environment:** Explore a virtual environment containing 3D models and objects.
- **PC component exploration:** Learn about essential computer hardware, including the CPU, RAM, motherboard, GPU, storage devices, power supply, CPU cooler, and computer case.
- **Educational quizzes:** Answer questions about component functions, hardware compatibility, troubleshooting, and maintenance.
- **Randomized quiz questions:** Use a question bank with multiple questions per component to create different quiz experiences.
- **Visual learning:** Connect theoretical concepts with three-dimensional representations of computer hardware.
- **Educational maintenance guidance:** Discover recommended maintenance practices and important hardware safety precautions.

## Technologies Used

- **[Vite](https://vite.dev/)** — Development server and build tool.
- **[TypeScript](https://www.typescriptlang.org/)** — Type-safe application development.
- **[Three.js](https://threejs.org/)** — Rendering and interaction with 3D graphics.
- **[Firebase Storage](https://firebase.google.com/docs/storage)** — Cloud storage for project assets, such as 3D models and other files, where configured.

## Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) — Use a version compatible with the project's Vite version.
- npm, included with Node.js, or another package manager supported by the project.
- Access to the Firebase project and configuration if the application requires Firebase services to run.

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:

   ```bash
   cd <project-directory>
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

4. Configure the required environment variables and Firebase settings, if applicable.

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open the local URL displayed in your terminal to access the application.

### Available Scripts

The following commands are commonly available in a Vite project. Check `package.json` for the exact scripts configured in this repository.

| Command | Description |
|---|---|
| `npm run dev` | Starts the development server. |
| `npm run build` | Builds the application for production. |
| `npm run preview` | Previews the production build locally. |

## Project Structure

The exact directory structure may vary, but the project generally includes the following areas:

- **Application source:** TypeScript code and application logic.
- **3D assets:** Models used to represent computer components and environmental objects.
- **Quiz data:** Questions, answer options, correct answers, and educational explanations.
- **Firebase integration:** Configuration and logic for accessing cloud-hosted assets.
- **Build configuration:** Vite and TypeScript configuration files.

## Educational Goals

The primary goal of this project is to provide an alternative way to teach computer hardware by combining visual exploration with active learning.

Students can use the application to:

- Identify the main components of a computer.
- Understand the role of each component.
- Compare storage technologies and graphics solutions.
- Learn basic hardware installation and maintenance practices.
- Reinforce their knowledge through interactive quizzes.

The project is intended as an educational complement to traditional instruction and practical computer hardware training.

## 3D Models and Credits

This project uses 3D models created by different artists and made available through various platforms. Credit is given to the original creators according to the information and license details provided with each asset.

### Computer Hardware

- **Graphics Card** — pgonarg, licensed under CC BY, via Poly Pizza.
- **CPU** — iPoly3D.
- **RAM** — iPoly3D.
- **PSU Power Supply Unit** — Groovex. [Source model](https://skfb.ly/oBPC9). Licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).
- **Cooler Master CPU Cooler** — BlenderFace. [Source model](https://skfb.ly/oQV6T). Licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).
- **Basic PC Case** — Sousinho. [Source model](https://skfb.ly/oyEOo). Licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).
- **Asus Strix B-550-F Gaming Motherboard Realistic** — MUSHROOM_BUILDS. [Source model](https://skfb.ly/oC9AN). Licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).
- **SSD M.2** — suuugar_mommy. [Source model](https://skfb.ly/p8IvM). Licensed under [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).

### Environment and Other Objects

- **Town House** — Quaternius.
- **Large Building** — Kenney.
- **Farm House** — Poly by Google, licensed under CC BY, via Poly Pizza.
- **Log Cabin** — Poly by Google, licensed under CC BY, via Poly Pizza.
- **Brit's House** — Anonymous, licensed under CC BY, via Poly Pizza.
- **Traffic Light** — Kay Lousberg.
- **Stop Sign** — Poly by Google, licensed under CC BY, via Poly Pizza.
- **Bus Stop** — Zsky, licensed under CC BY, via Poly Pizza.
- **Mazda RX-7** — IvOfficial, licensed under CC BY, via Poly Pizza.
- **Colosseum** — CreativeTrio.

### Attribution and Licensing

The 3D models listed above are the work of their respective creators and remain subject to their original licenses. The licenses applicable to individual assets may differ from the license governing this project's source code.

In particular:

- **CC BY 4.0:** Attribution is required, and adaptations and redistribution are permitted under the license terms.
- **CC BY-NC 4.0:** Attribution is required, and commercial use is not permitted under the license terms.

Please consult the original asset pages and license agreements before redistributing assets or using them in a commercial project. For models whose license information or source links have not been provided here, verify the original terms before redistribution.

## Author

**Sebastián Granados Barrantes**

This project was created to explore a more creative and interactive approach to teaching computer hardware and making technical concepts easier for students to understand.

---

*Built with TypeScript, Vite, Three.js, and Firebase Storage.*